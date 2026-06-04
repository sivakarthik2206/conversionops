import { redirect } from 'next/navigation';

// Magic link auth has been removed. Redirect any old verify links to login.
export default function VerifyPage() {
  redirect('/login');
}
