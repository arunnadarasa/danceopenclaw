import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Send,
  User,
  ArrowUp,
  Loader2,
  Unplug,
} from "lucide-react";

interface MoltbookConnection {
  id: string;
  moltbook_agent_name: string;
  claim_url: string | null;
  claim_status: string;
}

interface FeedPost {
  id: string;
  title: string;
  content: string;
  author?: string;
  author_name?: string;
  upvotes?: number;
  comments_count?: number;
  submolt?: string;
  created_at?: string;
}

interface ProfileData {
  name?: string;
  description?: string;
  karma?: number;
  followers?: number;
  following?: number;
  posts_count?: number;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  dancer:
    "Dance performer agent on Dance OpenClaw -- sharing moves, events, and dance culture",
  fan:
    "Dance fan agent on Dance OpenClaw -- discovering talent, supporting dancers, and sharing the vibe",
  organiser:
    "Dance event organiser agent on Dance OpenClaw -- promoting battles, workshops, and showcases",
};

async function callMoltbookProxy(action: string, data: Record<string, unknown> = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await supabase.functions.invoke("moltbook-proxy", {
    body: { action, ...data },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export default function MoltbookPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<MoltbookConnection | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [registering, setRegistering] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Feed state
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Post state
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postSubmolt, setPostSubmolt] = useState("");
  const [posting, setPosting] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load existing connection & agent info
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Check for existing connection (table may not be in generated types yet)
        const { data: conn } = await (supabase as any)
          .from("moltbook_connections")
          .select("id, moltbook_agent_name, claim_url, claim_status")
          .eq("user_id", user.id)
          .maybeSingle();

        setConnection(conn as MoltbookConnection | null);

        if (!conn) {
          // Pre-fill agent name and role-based description
          const { data: agent } = await supabase
            .from("agents")
            .select("name")
            .eq("user_id", user.id)
            .single();

          if (agent) setAgentName(agent.name.replace(/\s+/g, "_"));

          const { data: roleRow } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle();

          const role = (roleRow as { role: string } | null)?.role || "fan";
          setAgentDescription(ROLE_DESCRIPTIONS[role] || ROLE_DESCRIPTIONS.fan);
        }
      } catch (err) {
        console.error("Failed to load moltbook data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // --- Actions ---
  const handleRegister = async () => {
    setRegistering(true);
    try {
      const result = await callMoltbookProxy("register", {
        agentName,
        agentDescription,
      });
      setConnection({
        id: "",
        moltbook_agent_name: agentName,
        claim_url: result.claimUrl,
        claim_status: "pending_claim",
      });
      toast({
        title: "Registered on Moltbook!",
        description: "Claim your agent via the link to activate it.",
      });
    } catch (err: unknown) {
      toast({
        title: "Registration failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      const result = await callMoltbookProxy("status");
      setConnection((prev) =>
        prev ? { ...prev, claim_status: result.claim_status } : prev
      );
      toast({
        title: "Status updated",
        description: `Claim status: ${result.claim_status}`,
      });
    } catch (err: unknown) {
      toast({
        title: "Status check failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await callMoltbookProxy("disconnect");
      setConnection(null);
      toast({ title: "Disconnected from Moltbook" });
    } catch (err: unknown) {
      toast({
        title: "Disconnect failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const result = await callMoltbookProxy("feed", { sort: "hot", limit: 20 });
      setFeed(Array.isArray(result) ? result : result.posts || []);
    } catch {
      setFeed([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const result = await callMoltbookProxy("profile");
      setProfile(result);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const handlePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) return;
    setPosting(true);
    try {
      await callMoltbookProxy("post", {
        title: postTitle,
        content: postContent,
        submolt: postSubmolt || undefined,
      });
      toast({ title: "Posted to Moltbook!" });
      setPostTitle("");
      setPostContent("");
      setPostSubmolt("");
    } catch (err: unknown) {
      toast({
        title: "Post failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- NOT REGISTERED ---
  if (!connection) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moltbook</h1>
          <p className="text-muted-foreground">
            Connect your agent to Moltbook for agentic marketing on the social
            network for AI agents.
          </p>
        </div>

        <Card className="max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-primary" />
              <CardTitle className="text-lg">Register on Moltbook</CardTitle>
            </div>
            <CardDescription>
              Moltbook is like Reddit for AI agents. Register your agent to post,
              comment, and build karma in dance communities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent Name</label>
              <Input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="DanceOpenClaw_Agent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={handleRegister}
              disabled={registering || !agentName.trim() || !agentDescription.trim()}
              className="w-full"
            >
              {registering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register on Moltbook
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- REGISTERED ---
  const isClaimed = connection.claim_status === "claimed";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moltbook</h1>
          <p className="text-muted-foreground">
            Agent: {connection.moltbook_agent_name}
          </p>
        </div>
        <Badge variant={isClaimed ? "default" : "secondary"}>
          {isClaimed ? "Claimed" : "Pending Claim"}
        </Badge>
      </div>

      {/* Claim section */}
      {!isClaimed && connection.claim_url && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm font-medium">Claim your agent to activate it:</p>
            <a
              href={connection.claim_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
            >
              {connection.claim_url}
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="text-xs text-muted-foreground">
              Post a verification tweet to activate your agent on Moltbook.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckStatus}
                disabled={checkingStatus}
              >
                {checkingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="mr-1 h-4 w-4" />
                Check Status
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                <Unplug className="mr-1 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for claimed agents */}
      {isClaimed && (
        <Tabs defaultValue="feed" onValueChange={(v) => {
          if (v === "feed") loadFeed();
          if (v === "profile") loadProfile();
        }}>
          <TabsList>
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="post">Post</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Feed Tab */}
          <TabsContent value="feed" className="space-y-3">
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={loadFeed} disabled={feedLoading}>
                <RefreshCw className={`mr-1 h-4 w-4 ${feedLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            {feedLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : feed.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No posts found. Be the first to post!
              </p>
            ) : (
              <div className="space-y-2">
                {feed.map((post, i) => (
                  <Card key={post.id || i}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{post.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            by {post.author_name || post.author || "unknown"}
                            {post.submolt && (
                              <span className="ml-2 text-primary">m/{post.submolt}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                          <span className="flex items-center gap-1">
                            <ArrowUp className="h-3 w-3" />
                            {post.upvotes ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {post.comments_count ?? 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Post Tab */}
          <TabsContent value="post">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create a Post</CardTitle>
                <CardDescription>
                  Share content on Moltbook as your agent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Submolt (optional)</label>
                  <Input
                    value={postSubmolt}
                    onChange={(e) => setPostSubmolt(e.target.value)}
                    placeholder="e.g. dance"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Post title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={4}
                    placeholder="Write your post..."
                  />
                </div>
                <Button
                  onClick={handlePost}
                  disabled={posting || !postTitle.trim() || !postContent.trim()}
                >
                  {posting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Post
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            {profileLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : profile ? (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-semibold">{profile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.description}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2 text-center">
                    <div>
                      <p className="text-lg font-bold">{profile.karma ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Karma</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{profile.followers ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{profile.posts_count ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Posts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Could not load profile.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Disconnect button at the bottom for claimed agents */}
      {isClaimed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-destructive"
        >
          <Unplug className="mr-1 h-4 w-4" />
          Disconnect from Moltbook
        </Button>
      )}
    </div>
  );
}
