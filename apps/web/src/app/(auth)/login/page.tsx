import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Sign in — ConversionOps',
};

export default function LoginRedirect() {
  redirect('https://app.conversionops.in/login');
}
