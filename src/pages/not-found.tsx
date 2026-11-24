import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-serif text-6xl font-semibold tracking-tight text-muted-foreground/40">
        404
      </h1>
      <p className="text-balance text-lg text-muted-foreground">
        页面不存在或已被移动。
      </p>
      <Button asChild>
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}
