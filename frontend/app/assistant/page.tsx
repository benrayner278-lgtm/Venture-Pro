import { redirect } from 'next/navigation';

// The assistant now lives on the Chat page. Old links go there.
export default function AssistantPage() {
  redirect('/dashboard');
}
