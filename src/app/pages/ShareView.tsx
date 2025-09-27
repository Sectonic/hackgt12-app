import { useParams } from 'react-router-dom';
import { Card } from '@/app/components/ui/card';
import { Share2 } from 'lucide-react';

export default function ShareView() {
  const { token } = useParams();

  return (
    <div className="container mx-auto px-6 py-8">
      <Card className="text-center py-12">
        <Share2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Shared Floor Plan</h1>
        <p className="text-muted-foreground mb-4">View shared floor plan with token: {token}</p>
        <p className="text-sm text-muted-foreground">Shared view functionality coming soon...</p>
      </Card>
    </div>
  );
}
