import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { ProductEditControl } from "@/features/products/components/ProductEditControl";
import { backendUrl } from "@/lib/backendUrl";
import styles from "./page.module.css";

type ProductApiRecord = {
  default_unit: string | null;
  id: number;
  is_archived: boolean;
  last_purchase_date: string | null;
  last_purchase_store: string | null;
  last_purchase_unit: string | null;
  last_unit_price_cents: number | null;
  name: string;
};

type ProductLoadResult = {
  data: ProductApiRecord[];
  error: string | null;
};

type ProductsPageProps = {
  searchParams: Promise<{ search?: string | string[] }>;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatPurchaseDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

async function getProducts(): Promise<ProductLoadResult> {
  try {
    const cookieStore = await cookies();
    const response = await fetch(backendUrl("/api/products/"), {
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    });

    if (!response.ok) {
      return { data: [], error: "Unable to load products right now." };
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
      return {
        data: [],
        error: "The product service returned an unexpected response.",
      };
    }

    return { data: data as ProductApiRecord[], error: null };
  } catch {
    return { data: [], error: "Unable to load products right now." };
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawSearch = resolvedSearchParams.search;
  const search = typeof rawSearch === "string" ? rawSearch.trim() : "";
  const { data, error } = await getProducts();
  const normalizedSearch = search.toLocaleLowerCase();
  const products = data
    .filter((product) =>
      normalizedSearch
        ? product.name.toLocaleLowerCase().includes(normalizedSearch)
        : true,
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <AppShell title="Products">
      <section className={styles.panel} aria-label="Product list and search">
        <form className={styles.searchForm} action="/products" method="get">
          <label className={styles.searchLabel} htmlFor="product-search">
            Search products
          </label>
          <input
            className={styles.searchInput}
            defaultValue={search}
            id="product-search"
            name="search"
            placeholder="Search products"
            type="search"
          />
          <button className={styles.searchButton} type="submit">
            Search
          </button>
        </form>

        <div className={styles.tableHeader} aria-hidden="true">
          <span>Product</span>
          <span>Default unit</span>
          <span>Last bought</span>
          <span>Status</span>
          <span className={styles.actionsHeader}>Actions</span>
        </div>

        <div className={styles.productList}>
          {error ? (
            <p className={`${styles.stateMessage} ${styles.errorMessage}`} role="alert">
              {error}
            </p>
          ) : products.length === 0 ? (
            <p className={styles.stateMessage}>
              {search ? "No products match your search." : "No products yet."}
            </p>
          ) : (
            products.map((product) => (
              <article className={styles.productRow} key={product.id}>
                <div className={styles.productIdentity}>
                  <span className={styles.productInitial} aria-hidden="true">
                    {product.name.trim().charAt(0).toUpperCase() || "P"}
                  </span>
                  <p className={styles.productName}>{product.name}</p>
                </div>
                <p className={styles.defaultUnit}>{product.default_unit || "—"}</p>
                <div className={styles.lastPurchase}>
                  {product.last_unit_price_cents === null ? (
                    <p className={styles.noPurchase}>No purchase history</p>
                  ) : (
                    <>
                      <p className={styles.lastPrice}>
                        {currencyFormatter.format(
                          product.last_unit_price_cents / 100,
                        )}
                        {product.last_purchase_unit
                          ? ` / ${product.last_purchase_unit}`
                          : ""}
                      </p>
                      <p className={styles.purchaseContext}>
                        {[
                          product.last_purchase_store,
                          product.last_purchase_date
                            ? formatPurchaseDate(product.last_purchase_date)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </>
                  )}
                </div>
                <p
                  className={`${styles.status} ${
                    product.is_archived ? styles.archived : styles.active
                  }`}
                >
                  {product.is_archived ? "Archived" : "Active"}
                </p>
                <div className={styles.productActions}>
                  <ProductEditControl
                    product={{
                      defaultUnit: product.default_unit,
                      id: product.id,
                      name: product.name,
                    }}
                  />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
