import { todayLocalISO } from '../../lib/date-utils';
import React, { useState } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { PhysicalAsset, PhysicalAssetCategory, FundingMethod } from '../../types/accounting';
import {
  Car,
  Home,
  Coins,
  Shield,
  Plus,
  Building,
  AlertCircle,
  X,
  TrendingUp,
  Tag,
  Briefcase,
} from 'lucide-react';

export const AssetsView: React.FC = () => {
  const {
    physicalAssets,
    staticLiabilities,
    accounts,
    accountBalances,
    createPhysicalAsset,
    createStaticLiability,
  } = useLedger();

  const [activeTab, setActiveTab] = useState<'assets' | 'liabilities'>('assets');
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [isNewLiabModalOpen, setIsNewLiabModalOpen] = useState(false);

  // New Asset Form State
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<PhysicalAssetCategory>('vehicle');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>(2000000);
  const [purchaseDate, setPurchaseDate] = useState(() => todayLocalISO());
  const [fundingMethod, setFundingMethod] = useState<FundingMethod>('full_cash');
  const [fundingAccountId, setFundingAccountId] = useState('');
  const [cashDownpayment, setCashDownpayment] = useState<number | ''>(500000);
  const [loanAccountId, setLoanAccountId] = useState('');
  const [loanFinancedAmount, setLoanFinancedAmount] = useState<number | ''>(1500000);
  const [description, setDescription] = useState('');
  const [assetFormError, setAssetFormError] = useState('');

  // Custom Physical Asset Category State
  const [customAssetCategories, setCustomAssetCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('moneycanvas_custom_asset_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });
  const [isCreatingCustomAssetCat, setIsCreatingCustomAssetCat] = useState(false);
  const [customAssetCatName, setCustomAssetCatName] = useState('');
  const [customAssetCatError, setCustomAssetCatError] = useState('');

  // New Liability Form State
  const [liabName, setLiabName] = useState('');
  const [liabType] = useState('Personal Obligation');
  const [liabAmount, setLiabAmount] = useState<number | ''>(50000);
  const [liabFormError, setLiabFormError] = useState('');

  // Liquid accounts for funding
  const liquidAccounts = accounts.filter(
    (a) => !a.isArchived && (a.accountType === 'bank' || a.accountType === 'cash' || a.accountType === 'mobile_wallet')
  );

  // Loan accounts for asset financing
  const loanAccounts = accounts.filter((a) => !a.isArchived && a.accountType === 'loan');

  // Helper to get current ledger balance for asset
  const getAssetBalance = (asset: PhysicalAsset) => {
    const bal = accountBalances.find((b) => b.accountId === asset.assetAccountId);
    return bal ? bal.currentBalance : asset.purchasePrice;
  };

  const totalAssetValuation = physicalAssets.reduce((sum, a) => sum + getAssetBalance(a), 0);
  const totalStaticLiabilities = staticLiabilities.reduce((sum, l) => sum + l.initialAmount, 0);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vehicle':
        return <Car className="h-4 w-4 text-accent-strong" />;
      case 'real_estate':
        return <Home className="h-4 w-4 text-sky-400" />;
      case 'gold_jewelry':
        return <Coins className="h-4 w-4 text-warning" />;
      case 'land':
        return <Building className="h-4 w-4 text-accent-strong" />;
      case 'electronics':
        return <Tag className="h-4 w-4 text-cyan-400" />;
      default:
        return <Briefcase className="h-4 w-4 text-purple-400" />;
    }
  };

  const handleAddCustomAssetCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomAssetCatError('');
    const trimmed = customAssetCatName.trim();
    if (!trimmed) {
      setCustomAssetCatError('Please enter a category name.');
      return;
    }
    if (!customAssetCategories.includes(trimmed)) {
      const updated = [...customAssetCategories, trimmed];
      setCustomAssetCategories(updated);
      try {
        localStorage.setItem('moneycanvas_custom_asset_categories', JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
    }
    setAssetCategory(trimmed as any);
    setIsCreatingCustomAssetCat(false);
    setCustomAssetCatName('');
  };

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAssetFormError('');

    if (!assetName.trim()) {
      setAssetFormError('Please enter an asset name.');
      return;
    }
    const price = typeof purchasePrice === 'number' ? purchasePrice : parseFloat(purchasePrice);
    if (isNaN(price) || price <= 0) {
      setAssetFormError('Please enter a valid purchase price.');
      return;
    }

    if (fundingMethod === 'full_cash') {
      if (!fundingAccountId) {
        setAssetFormError('Please select the funding bank or cash account.');
        return;
      }
    } else if (fundingMethod === 'cash_plus_loan') {
      const down = typeof cashDownpayment === 'number' ? cashDownpayment : 0;
      const loanAmt = typeof loanFinancedAmount === 'number' ? loanFinancedAmount : 0;
      if (Math.abs(down + loanAmt - price) > 0.01) {
        setAssetFormError(`Downpayment (৳${down.toLocaleString()}) + Loan (৳${loanAmt.toLocaleString()}) must equal purchase price (৳${price.toLocaleString()}).`);
        return;
      }
    }

    const res = createPhysicalAsset({
      assetName: assetName.trim(),
      assetCategory,
      purchasePrice: price,
      purchaseDate,
      fundingMethod,
      fundingAccountId: fundingAccountId || undefined,
      cashDownpayment: typeof cashDownpayment === 'number' ? cashDownpayment : undefined,
      loanAccountId: loanAccountId || undefined,
      loanFinancedAmount: typeof loanFinancedAmount === 'number' ? loanFinancedAmount : undefined,
      description: description.trim() || undefined,
    });

    if (res.success) {
      setIsNewAssetModalOpen(false);
      setAssetName('');
      setDescription('');
    } else {
      setAssetFormError(res.error || 'Failed to record physical asset.');
    }
  };

  const handleLiabSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLiabFormError('');

    if (!liabName.trim()) {
      setLiabFormError('Please enter a liability name.');
      return;
    }
    const amt = typeof liabAmount === 'number' ? liabAmount : parseFloat(liabAmount);
    if (isNaN(amt) || amt <= 0) {
      setLiabFormError('Please enter a positive liability amount.');
      return;
    }

    const res = createStaticLiability(liabName.trim(), liabType.trim(), amt);
    if (res.success) {
      setIsNewLiabModalOpen(false);
      setLiabName('');
    } else {
      setLiabFormError('Failed to record static liability.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-strong mb-1">
            <Home className="h-4 w-4" />
            <span>Physical Assets & Fixed Property</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Physical Assets & Valuables
          </h1>
          <p className="text-ink-muted text-xs sm:text-sm mt-0.5">
            Real estate, land, vehicles, gold bullion, and static assets with multi-source financing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setAssetFormError('');
              if (liquidAccounts.length > 0) setFundingAccountId(liquidAccounts[0].id);
              if (loanAccounts.length > 0) setLoanAccountId(loanAccounts[0].id);
              setIsNewAssetModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-semibold text-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Physical Asset</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-edge bg-surface/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Physical Assets Value</span>
            <div className="h-6 w-6 rounded bg-accent/10 flex items-center justify-center text-accent-strong">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-accent-strong font-mono">
            ৳{totalAssetValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-faint font-mono">
            {physicalAssets.length} Registered Assets
          </div>
        </div>

        <div className="p-4 rounded-xl border border-edge bg-surface/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Static Liabilities</span>
            <div className="h-6 w-6 rounded bg-negative/10 flex items-center justify-center text-negative">
              <Shield className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-negative font-mono">
            ৳{totalStaticLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-faint font-mono">
            {staticLiabilities.length} Static Obligations
          </div>
        </div>

        <div className="p-4 rounded-xl border border-edge bg-surface/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Net Asset Equity</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent-strong">
              Equity Verified
            </span>
          </div>
          <div className="text-xl font-bold text-ink font-mono">
            ৳{(totalAssetValuation - totalStaticLiabilities).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-ink-faint font-mono">
            Assets minus static liabilities
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-edge pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'assets'
                ? 'bg-raised text-ink font-semibold'
                : 'text-ink-muted hover:text-ink-soft'
            }`}
          >
            Physical Assets ({physicalAssets.length})
          </button>
          <button
            onClick={() => setActiveTab('liabilities')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'liabilities'
                ? 'bg-raised text-ink font-semibold'
                : 'text-ink-muted hover:text-ink-soft'
            }`}
          >
            Static Obligations ({staticLiabilities.length})
          </button>
        </div>

        {activeTab === 'liabilities' && (
          <button
            onClick={() => {
              setLiabFormError('');
              setIsNewLiabModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-negative/10 hover:bg-negative/20 text-negative border border-negative/30 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Static Obligation</span>
          </button>
        )}
      </div>

      {/* Content View */}
      {activeTab === 'assets' ? (
        <div className="rounded-xl border border-edge bg-surface/40 divide-y divide-edge/80 overflow-hidden">
          {physicalAssets.length === 0 ? (
            <div className="p-12 text-center text-ink-faint space-y-2">
              <Home className="h-8 w-8 mx-auto text-slate-600 stroke-[1.5]" />
              <div className="text-sm font-medium text-ink-muted">No physical assets registered</div>
              <div className="text-xs">Add your vehicle, real estate, gold bullion, or land to track their balance sheet equity.</div>
            </div>
          ) : (
            physicalAssets.map((asset) => {
              const valuation = getAssetBalance(asset);
              return (
                <div
                  key={asset.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface/80 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-raised flex items-center justify-center">
                        {getCategoryIcon(asset.assetCategory)}
                      </span>
                      <span className="text-xs font-mono uppercase text-ink-muted">
                        {asset.assetCategory.replace('_', ' ')}
                      </span>
                      {asset.assetCategory === 'gold_jewelry' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                          Zakatable Asset
                        </span>
                      )}
                    </div>

                    <div className="text-base font-semibold text-ink">
                      {asset.assetName}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted font-mono">
                      <span>Acquired: {asset.purchaseDate}</span>
                      {asset.description && <span className="text-ink-faint truncate max-w-md">"{asset.description}"</span>}
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono">
                    <div className="text-[10px] text-ink-faint uppercase">Valuation (Cost Basis)</div>
                    <div className="text-lg font-bold text-accent-strong">
                      ৳{valuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-ink-faint">
                      Canonical Account Linked
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-edge bg-surface/40 divide-y divide-edge/80 overflow-hidden">
          {staticLiabilities.length === 0 ? (
            <div className="p-12 text-center text-ink-faint space-y-2">
              <Shield className="h-8 w-8 mx-auto text-slate-600 stroke-[1.5]" />
              <div className="text-sm font-medium text-ink-muted">No static liabilities registered</div>
              <div className="text-xs">Record promissory obligations or custom balance sheet liabilities.</div>
            </div>
          ) : (
            staticLiabilities.map((liab) => (
              <div
                key={liab.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-surface/80 transition-colors"
              >
                <div>
                  <div className="text-base font-semibold text-ink">{liab.liabilityName}</div>
                  <div className="text-xs text-ink-muted font-mono">{liab.liabilityType}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-lg font-bold text-negative">
                    ৳{liab.initialAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-ink-faint">Liability Account</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: Register New Asset */}
      {isNewAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-edge bg-surface shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div className="flex items-center gap-2 text-ink font-semibold text-base">
                <Home className="h-5 w-5 text-accent-strong" />
                <span>Register Physical Asset</span>
              </div>
              <button
                onClick={() => setIsNewAssetModalOpen(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {assetFormError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-negative text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{assetFormError}</span>
              </div>
            )}

            <form onSubmit={handleAssetSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-soft font-medium mb-1">
                    Asset Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toyota Premio G-Superior"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-canvas px-3 py-2 text-ink placeholder-slate-500 focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-ink-soft font-medium">
                      Asset Category
                    </label>
                    {!isCreatingCustomAssetCat && (
                      <button
                        type="button"
                        onClick={() => setIsCreatingCustomAssetCat(true)}
                        className="text-[11px] text-accent-strong hover:text-accent-strong flex items-center gap-1 font-sans"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Custom Category</span>
                      </button>
                    )}
                  </div>

                  {isCreatingCustomAssetCat ? (
                    <div className="p-3 bg-canvas border border-accent/40 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-accent-strong font-semibold uppercase">New Asset Category</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingCustomAssetCat(false);
                            setCustomAssetCatName('');
                            setCustomAssetCatError('');
                          }}
                          className="text-ink-muted hover:text-ink"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {customAssetCatError && (
                        <div className="text-[11px] text-negative">{customAssetCatError}</div>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Machinery, Art & Antiques, Farm"
                          value={customAssetCatName}
                          onChange={(e) => setCustomAssetCatName(e.target.value)}
                          className="flex-1 bg-surface border border-slate-700 rounded-lg px-2.5 py-1.5 text-ink text-xs focus:outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomAssetCategory}
                          className="px-3 py-1.5 bg-accent-deep hover:bg-accent text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={assetCategory}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setIsCreatingCustomAssetCat(true);
                        } else {
                          setAssetCategory(e.target.value as any);
                        }
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none capitalize"
                    >
                      <option value="vehicle">Vehicle / Car / Motorcycle</option>
                      <option value="real_estate">Real Estate / Apartment</option>
                      <option value="gold_jewelry">Gold Bullion / Jewelry (Zakatable)</option>
                      <option value="land">Land Property</option>
                      <option value="electronics">High-Value Electronics</option>
                      <option value="other">Other Capital Asset</option>
                      {customAssetCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat} (Custom)
                        </option>
                      ))}
                      <option value="__new__">+ Add Custom Category...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-soft font-medium mb-1">
                    Purchase Price / Valuation (৳) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full rounded-lg border border-slate-700 bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-ink-soft font-medium mb-1">
                    Acquisition Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Funding Method */}
              <div>
                <label className="block text-ink-soft font-medium mb-1">
                  Funding Method *
                </label>
                <select
                  value={fundingMethod}
                  onChange={(e) => setFundingMethod(e.target.value as FundingMethod)}
                  className="w-full rounded-lg border border-slate-700 bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                >
                  <option value="full_cash">100% Cash / Bank Funding</option>
                  <option value="cash_plus_loan">Downpayment + Loan Financing (Test Case 13)</option>
                  <option value="opening_equity">Historical Acquisition / Opening Balance Equity</option>
                </select>
              </div>

              {fundingMethod === 'full_cash' && (
                <div>
                  <label className="block text-ink-soft font-medium mb-1">
                    Source Bank Account *
                  </label>
                  <select
                    value={fundingAccountId}
                    onChange={(e) => setFundingAccountId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
                  >
                    {liquidAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {fundingMethod === 'cash_plus_loan' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-canvas border border-edge">
                  <div>
                    <label className="block text-ink-soft font-medium mb-1">
                      Cash Downpayment (৳)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={cashDownpayment}
                      onChange={(e) => setCashDownpayment(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-ink font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-ink-soft font-medium mb-1">
                      Financed Amount (৳)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={loanFinancedAmount}
                      onChange={(e) => setLoanFinancedAmount(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2 text-ink font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-ink-soft font-medium mb-1">
                  Asset Description / Identifier (Deed #, VIN, Hallmarked weight)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dhaka Metro GA-35 • 40g 22K certified hallmarked"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-canvas px-3 py-2 text-ink placeholder-slate-500 focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewAssetModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-ink-soft hover:bg-raised text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-strong text-accent-ink font-semibold text-xs transition-colors"
                >
                  Record Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Register Static Liability */}
      {isNewLiabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-edge bg-surface shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div className="flex items-center gap-2 text-ink font-semibold text-base">
                <Shield className="h-5 w-5 text-negative" />
                <span>Add Static Obligation</span>
              </div>
              <button
                onClick={() => setIsNewLiabModalOpen(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {liabFormError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-negative text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{liabFormError}</span>
              </div>
            )}

            <form onSubmit={handleLiabSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-ink-soft font-medium mb-1">
                  Obligation Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Promissory Note to Business Partner"
                  value={liabName}
                  onChange={(e) => setLiabName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-canvas px-3 py-2 text-ink placeholder-slate-500 focus:border-negative focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-ink-soft font-medium mb-1">
                  Obligation Amount (৳ BDT) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={liabAmount}
                  onChange={(e) => setLiabAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  className="w-full rounded-lg border border-slate-700 bg-canvas px-3 py-2 text-ink focus:border-negative focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewLiabModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-ink-soft hover:bg-raised text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-negative hover:bg-negative text-white font-semibold text-xs transition-colors"
                >
                  Save Obligation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
