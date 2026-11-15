import { redirect } from 'next/navigation';

// The Start here page is now the Progress page. Old links go there.
export default function StartPage() {
  redirect('/progress');
}
