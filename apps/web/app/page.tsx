import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent mb-4">
          Art Toys Blind Box
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Discover, collect, and unbox exclusive Art Toys figures.
          Experience the thrill of the reveal and pickup at your nearest branch!
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/series">
            <Button size="lg">Browse Series</Button>
          </Link>
          <Link href="/drops">
            <Button variant="outline" size="lg">Upcoming Drops</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
