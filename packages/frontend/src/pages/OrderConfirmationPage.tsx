import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { getOrder, cancelOrder, type Order } from '@/api/orders';
import { useCart } from '@/context/CartContext';
import { canCancelOrderStatus, getOrderStatusMeta } from '@/lib/order-status';

function StatusBadge({ status }: { status: string }) {
  const s = getOrderStatusMeta(status);
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 font-sans text-[12px] font-semibold ${s.color}`}
    >
      {s.label}
    </span>
  );
}

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isSuccess = searchParams.get('payment') === 'success';
  const { removeItem } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getOrder(id)
      .then((o) => {
        setOrder(o);
        // Clear capsule items that are now ordered
        if (isSuccess) {
          o.items.forEach((item) => removeItem(item.productId));
        }
      })
      .catch((err) => {
        console.error('[OrderConfirmation] Failed to load order:', err);
      })
      .finally(() => setLoading(false));
  }, [id, isSuccess, removeItem]);

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    try {
      const updated = await cancelOrder(order.id);
      setOrder(updated);
    } finally {
      setCancelling(false);
    }
  }

  const canCancel = !!order && canCancelOrderStatus(order.status);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-ivory pt-16">
        {loading && (
          <Container className="py-24 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-linen border-t-brand" />
          </Container>
        )}

        {!loading && !order && (
          <Container className="py-24 text-center">
            <p className="font-serif text-2xl text-ink">Order not found</p>
            <Link
              to="/account"
              className="mt-4 inline-block font-sans text-sm text-brand underline"
            >
              View my orders
            </Link>
          </Container>
        )}

        {order && (
          <>
            <Container className="py-10 pt-14">
              {/* Header */}
              {isSuccess && order.status !== 'cancelled' ? (
                <div className="mb-10 rounded-2xl bg-brand/8 border border-brand/20 px-6 py-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand">
                    <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
                      <path
                        d="M2 9l7 7L22 2"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h1 className="font-serif text-[28px] font-semibold text-ink">
                    You&rsquo;re all set!
                  </h1>
                  <p className="mt-2 font-sans text-[15px] text-stone">
                    Order <span className="font-semibold text-ink">#{order.orderNumber}</span> is
                    confirmed. We&rsquo;ll be in touch soon.
                  </p>
                </div>
              ) : (
                <div className="mb-8">
                  <nav className="mb-4 flex items-center gap-1.5 font-sans text-[12px] text-stone">
                    <Link to="/account" className="hover:text-ink">
                      My Account
                    </Link>
                    <span className="text-sand">/</span>
                    <span className="text-ink">Order #{order.orderNumber}</span>
                  </nav>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="font-serif text-[28px] font-semibold text-ink">
                        Order #{order.orderNumber}
                      </h1>
                      <p className="mt-1 font-sans text-[13px] text-stone">
                        Placed on{' '}
                        {new Date(order.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
                {/* Items */}
                <div>
                  <h2 className="mb-4 font-serif text-xl font-semibold text-ink">Items</h2>
                  <div className="divide-y divide-linen rounded-xl border border-linen bg-white">
                    {order.items.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-serif text-[16px] font-semibold text-ink">
                            {item.productName}
                          </p>
                          <p className="font-sans text-[13px] text-stone">{item.brand}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-sans text-[14px] font-semibold text-ink">
                            €{item.subtotal.toFixed(2)}
                          </p>
                          <p className="font-sans text-[12px] text-stone">
                            €{item.pricePerDay}/day × {item.days}d
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-5">
                  <div className="rounded-xl border border-linen bg-white p-5">
                    <h3 className="font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone mb-4">
                      Rental period
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 rounded-lg bg-pearl px-3 py-2.5">
                        <p className="font-sans text-[10px] uppercase tracking-wider text-stone">
                          Pick-up
                        </p>
                        <p className="font-sans text-[14px] font-semibold text-ink">
                          {new Date(order.rentalStart).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <svg
                        width="14"
                        height="8"
                        viewBox="0 0 14 8"
                        fill="none"
                        className="text-stone shrink-0"
                      >
                        <path
                          d="M1 4h12M9 1l3 3-3 3"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex-1 rounded-lg bg-pearl px-3 py-2.5">
                        <p className="font-sans text-[10px] uppercase tracking-wider text-stone">
                          Return
                        </p>
                        <p className="font-sans text-[14px] font-semibold text-ink">
                          {new Date(order.rentalEnd).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-linen bg-white p-5">
                    <h3 className="font-sans text-[12px] font-semibold uppercase tracking-[0.9px] text-stone mb-3">
                      Total
                    </h3>
                    <p className="font-sans text-[26px] font-semibold text-ink">
                      €{order.totalAmount.toFixed(2)}
                    </p>
                  </div>

                  {canCancel && (
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="w-full cursor-pointer rounded-default border-[1.5px] border-sand py-2.5 font-sans text-[13px] font-medium text-stone transition-all hover:border-red-300 hover:text-red-600 disabled:opacity-60"
                    >
                      {cancelling ? 'Cancelling…' : 'Cancel order'}
                    </button>
                  )}

                  <Button variant="outline" href="/collection" className="w-full">
                    Continue browsing
                  </Button>
                </div>
              </div>
            </Container>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
