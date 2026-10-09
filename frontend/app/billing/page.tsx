'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

interface Plan {
  name: string;
  price: number;
  interval: string;
  features: string[];
}

interface Plans {
  [key: string]: Plan;
}

interface BillingInfo {
  id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: string;
  date: string;
  pdfUrl?: string;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plans>({});
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [stripe, setStripe] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plans'>('dashboard');
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    // Load Stripe.js script once
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      const stripeInstance = (window as any).Stripe('pk_test_51ULZI1AErbAgLu1FHunakrJCX2hZTpmggHMUfxnTsozuzO5RaLyXwVN55Hw5hRNaF7M3kQcKWnTEFsA0UXiv1seQ001Wepxdn9');
      setStripe(stripeInstance);
    };
    document.head.appendChild(script);

    // Fetch billing info and plans
    const fetchData = async () => {
      try {
        if (userId) {
          const billingResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/${userId}`);
          if (billingResponse.ok) {
            const billingData = await billingResponse.json();
            setBillingInfo(billingData);
          }

          const invoicesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/${userId}/invoices`);
          if (invoicesResponse.ok) {
            const invoicesData = await invoicesResponse.json();
            setInvoices(invoicesData || []);
          }
        }

        const plansResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/checkout/plans`);
        const plansData = await plansResponse.json();
        setPlans(plansData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);

    try {
      if (!stripe) {
        alert('Payment system loading. Please try again in a moment.');
        return;
      }

      if (!userId) {
        alert('Please log in first');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/checkout/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Checkout error: ${error.error}`);
        return;
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!userId) return;
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    setCanceling(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/${userId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        alert('Subscription canceled successfully');
        if (billingInfo) {
          setBillingInfo({ ...billingInfo, plan: 'free', subscriptionStatus: 'canceled' });
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert('Failed to cancel subscription');
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-gray-900 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-5 shadow-lg backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Plans</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Manage your subscription and billing</p>
        </div>

        {/* Messages */}
        {success && (
          <div className="mx-8 mt-6 bg-green-900/30 border border-green-700/50 rounded-lg p-4 max-w-4xl">
            <p className="text-green-300 font-medium">✅ Payment successful! Your subscription is now active.</p>
          </div>
        )}
        {canceled && (
          <div className="mx-8 mt-6 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 max-w-4xl">
            <p className="text-yellow-300 font-medium">⚠️ Checkout was canceled. Please try again.</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-gray-400">Loading billing information...</div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              {/* Tabs */}
              <div className="flex gap-4 mb-8 border-b border-gray-800">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-3 font-medium border-b-2 transition ${
                    activeTab === 'dashboard'
                      ? 'text-blue-400 border-blue-500'
                      : 'text-gray-400 border-transparent hover:text-gray-300'
                  }`}
                >
                  Billing Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('plans')}
                  className={`px-4 py-3 font-medium border-b-2 transition ${
                    activeTab === 'plans'
                      ? 'text-blue-400 border-blue-500'
                      : 'text-gray-400 border-transparent hover:text-gray-300'
                  }`}
                >
                  Upgrade Plan
                </button>
              </div>

              {/* Dashboard Tab */}
              {activeTab === 'dashboard' && billingInfo && (
                <div className="space-y-8">
                  {/* Current Plan */}
                  <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-8">
                    <h2 className="text-xl font-bold text-white mb-6">Current Plan</h2>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Plan</p>
                        <p className="text-2xl font-bold text-white capitalize">{billingInfo.plan}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Status</p>
                        <p className={`text-lg font-semibold ${
                          billingInfo.subscriptionStatus === 'active' ? 'text-green-400' : 'text-gray-400'
                        }`}>
                          {billingInfo.subscriptionStatus === 'active' ? '✓ Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>

                    {billingInfo.subscriptionStatus === 'active' && billingInfo.plan !== 'free' && (
                      <button
                        onClick={handleCancelSubscription}
                        disabled={canceling}
                        className="mt-6 px-6 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-semibold text-sm transition disabled:opacity-60"
                      >
                        {canceling ? 'Canceling...' : 'Cancel Subscription'}
                      </button>
                    )}
                  </div>

                  {/* Invoices */}
                  <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-8">
                    <h2 className="text-xl font-bold text-white mb-6">Billing History</h2>
                    {invoices.length === 0 ? (
                      <p className="text-gray-400">No invoices yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-800">
                              <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Invoice</th>
                              <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Date</th>
                              <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Amount</th>
                              <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Status</th>
                              <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.map((invoice) => (
                              <tr key={invoice.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition">
                                <td className="py-4 px-4 text-white text-sm">{invoice.number || 'N/A'}</td>
                                <td className="py-4 px-4 text-gray-300 text-sm">
                                  {new Date(invoice.date).toLocaleDateString()}
                                </td>
                                <td className="py-4 px-4 text-white text-sm font-medium">
                                  £{(invoice.amount / 100).toFixed(2)}
                                </td>
                                <td className="py-4 px-4 text-sm">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    invoice.status === 'paid'
                                      ? 'bg-green-600/20 text-green-400'
                                      : 'bg-yellow-600/20 text-yellow-400'
                                  }`}>
                                    {invoice.status}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  {invoice.pdfUrl ? (
                                    <a
                                      href={invoice.pdfUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 text-sm font-semibold"
                                    >
                                      Download
                                    </a>
                                  ) : (
                                    <span className="text-gray-500 text-sm">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Plans Tab */}
              {activeTab === 'plans' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {Object.entries(plans).map(([planId, plan]) => (
                    <div
                      key={planId}
                      className={`rounded-2xl p-8 flex flex-col transition ${
                        planId === 'professional'
                          ? 'bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/50 ring-2 ring-blue-500/30'
                          : 'bg-gray-900/50 border border-gray-800/50 hover:border-gray-700'
                      }`}
                    >
                      {planId === 'professional' && (
                        <div className="mb-4">
                          <span className="text-xs font-bold text-blue-400 bg-blue-600/20 px-3 py-1 rounded-full">
                            RECOMMENDED
                          </span>
                        </div>
                      )}

                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-white">
                          £{(plan.price / 100).toFixed(2)}
                        </span>
                        <span className="text-gray-400 ml-2">/ {plan.interval}</span>
                      </div>

                      <ul className="flex-1 space-y-3 mb-8">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-blue-400 mt-1">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleCheckout(planId)}
                        disabled={checkoutLoading === planId}
                        className={`w-full py-3 rounded-lg font-semibold text-sm transition ${
                          planId === 'professional'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {checkoutLoading === planId ? 'Loading...' : 'Get Started'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
