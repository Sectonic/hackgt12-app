import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { useToast } from '@/app/hooks/use-toast';
import { Copy, Share2, Check, Mail, Link } from 'lucide-react';

interface Plan {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface SharePlanDialogProps {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SharePlanDialog({ plan, isOpen, onClose }: SharePlanDialogProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareMethod, setShareMethod] = useState<'link' | 'email'>('link');
  const { toast } = useToast();

  useEffect(() => {
    if (plan && isOpen) {
      // Generate a share URL (in a real app, this would be a proper share token)
      const baseUrl = window.location.origin;
      const shareToken = `s_${plan.id}_${Date.now()}`;
      setShareUrl(`${baseUrl}/s/${shareToken}`);
    }
  }, [plan, isOpen]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The share link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast({
        title: "Copy failed",
        description: "Unable to copy the link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEmailShare = () => {
    if (!email.trim()) return;
    
    const subject = `Check out this floor plan: ${plan?.title}`;
    const body = `Hi,\n\nI wanted to share this floor plan with you: ${plan?.title}\n\n${plan?.description || ''}\n\nView it here: ${shareUrl}\n\nBest regards!`;
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
    
    toast({
      title: "Email opened!",
      description: `Your email client should open with a draft to ${email}.`,
    });
  };

  const handleClose = () => {
    setEmail('');
    setCopied(false);
    setShareMethod('link');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Plan
          </DialogTitle>
          <DialogDescription>
            Share "{plan?.title}" with others using the options below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Share Method Tabs */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <Button
              variant={shareMethod === 'link' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShareMethod('link')}
              className="flex-1"
            >
              <Link className="h-4 w-4 mr-2" />
              Link
            </Button>
            <Button
              variant={shareMethod === 'email' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShareMethod('email')}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>

          {/* Link Sharing */}
          {shareMethod === 'link' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Share Link</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Anyone with this link can view your plan
                </p>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="px-3"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600">Link copied to clipboard!</p>
                )}
              </div>
            </div>
          )}

          {/* Email Sharing */}
          {shareMethod === 'email' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address..."
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {shareMethod === 'email' && (
            <Button onClick={handleEmailShare} disabled={!email.trim()}>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
