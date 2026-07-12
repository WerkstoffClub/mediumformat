import { Link } from 'react-router-dom';

/**
 * Sticky-top announcement bar per mockup-storefront (32px accent bar,
 * inverted-on-accent text, small linked call-out at the end).
 */
export function AnnouncementBar() {
  return (
    <div className="announce" role="region" aria-label="Store announcement">
      <span>
        Free shipping on orders over{' '}
        <strong>Rp&nbsp;500.000</strong> within Jakarta —
      </span>
      <Link to="/catalog?sort=new">New arrivals just landed</Link>
    </div>
  );
}
