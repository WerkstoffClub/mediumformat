import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCatalogProducts, artistsLabel } from "@/lib/catalog";
import { isWholesaleCustomer } from "@/lib/pricing";
import { formatIdr } from "@/lib/format";
import { CoverImg } from "@/components/site/CoverImg";

export const dynamic = "force-dynamic";

export default async function WholesalePage() {
  const session = await auth();
  const wholesale = await isWholesaleCustomer();

  if (!session) {
    return (
      <div className="page-narrow">
        <h1 className="page-title">Wholesale</h1>
        <p className="page-lead">
          Sign in with an approved wholesale account to see trade pricing.
        </p>
        <Link href="/account" className="page-link">Sign in</Link>
      </div>
    );
  }

  if (!wholesale) {
    return (
      <div className="page-narrow">
        <h1 className="page-title">Wholesale</h1>
        <p className="page-lead">
          Your account isn&apos;t approved for wholesale yet. Email us to get set up —
          approved accounts see trade pricing here and are charged wholesale rates at
          checkout.
        </p>
      </div>
    );
  }

  const products = await getCatalogProducts(60);

  return (
    <div className="content">
      <div className="content-bar">
        <div className="result-count">
          <strong>Wholesale</strong> · trade pricing · you&apos;re charged these rates at checkout
        </div>
      </div>
      <div className="grid">
        {products.map((p) => {
          const artist = p.release ? artistsLabel(p.release.artistsJson) : p.title;
          const cover = p.heroImage ?? p.release?.coverUrl ?? null;
          const v = p.variants[0];
          const retail = v ? Number(v.priceIdr.toString()) : null;
          const ws = v?.wholesalePriceIdr != null ? Number(v.wholesalePriceIdr.toString()) : null;
          return (
            <Link key={p.id} href={`/releases/${p.slug}`} className="rcard">
              <div className="cover">
                <CoverImg src={cover} alt={p.title} />
              </div>
              <div className="rinfo">
                <div className="rartist">{artist}</div>
                <div className="rtitle">{p.title}</div>
                <div className="price-row-card">
                  <span className="rprice">
                    {ws != null ? formatIdr(ws) : retail != null ? formatIdr(retail) : "—"}
                    {ws != null && retail != null && (
                      <span
                        style={{
                          color: "var(--mute)",
                          textDecoration: "line-through",
                          marginLeft: 6,
                          fontSize: 12,
                        }}
                      >
                        {formatIdr(retail)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
