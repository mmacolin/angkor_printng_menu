import { Link } from 'react-router-dom';
import { useSite } from '../lib/site';
import { useLang } from '../lib/i18n';

export default function NotFound({ message }: { message?: string }) {
  const { linkTo } = useSite();
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-lg font-bold text-ink">{message ?? t.notFound}</p>
      <Link
        to={linkTo('/')}
        className="focus-ring mt-4 inline-block rounded-full bg-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white"
      >
        {t.browse}
      </Link>
    </div>
  );
}
