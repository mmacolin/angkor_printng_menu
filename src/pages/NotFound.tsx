import { Link } from 'react-router-dom';
import { useSite } from '../lib/site';

export default function NotFound({ message = 'This page could not be found.' }: { message?: string }) {
  const { linkTo } = useSite();
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-lg font-bold text-ink">{message}</p>
      <Link
        to={linkTo('/')}
        className="focus-ring mt-4 inline-block rounded-full bg-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white"
      >
        Browse the catalogue
      </Link>
    </div>
  );
}
