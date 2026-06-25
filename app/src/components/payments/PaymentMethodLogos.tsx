'use client';

// Accepted-payment brand logos for checkout (design §2.7).
//  - Card networks (Visa/Mastercard/Amex/Discover) use the official-style SVGs from
//    `react-svg-credit-card-payment-icons` (inline, no network/asset 404s).
//  - Wallets (PayPal/Google Pay/Apple Pay) use brand marks: PayPal inline wordmark;
//    Apple Pay + Google Pay are the OFFICIAL mark SVGs served from /public/payment-icons
//    (brand-guideline compliant). These are DISPLAY-ONLY — functional Apple/Google Pay
//    buttons require PayPal domain registration + HTTPS (deferred to cutover).

import { PaymentIcon } from 'react-svg-credit-card-payment-icons';

const PayPalMark = () => (
  <span className="text-[15px] font-bold leading-none">
    <span className="text-[#003087]">Pay</span>
    <span className="text-[#009cde]">Pal</span>
  </span>
);

// Venmo brand wordmark (inline, no asset). Venmo's brand blue is #008CFF; the
// wordmark is conventionally lowercase italic. Display-only chip — the functional
// Venmo button is rendered by the PayPal SDK (enable-funding=venmo) at checkout.
const VenmoMark = () => (
  <span className="text-[15px] font-bold italic leading-none text-[#008CFF]">
    venmo
  </span>
);


type CardMethod = { label: string; type: 'Visa' | 'Mastercard' | 'Amex' | 'Discover' };
type WalletMethod =
  | { label: string; custom: 'paypal' | 'venmo' }
  | { label: string; img: string; imgClassName?: string };



const CARD_METHODS: CardMethod[] = [
  { label: 'Visa', type: 'Visa' },
  { label: 'Mastercard', type: 'Mastercard' },
  { label: 'American Express', type: 'Amex' },
  { label: 'Discover', type: 'Discover' },
];

const WALLET_METHODS: WalletMethod[] = [
  { label: 'PayPal', custom: 'paypal' },
  { label: 'Venmo', custom: 'venmo' },
  // The official Google Pay mark SVG has heavy built-in padding, so it renders tiny
  // at the shared cap — scale it up to visually match the PayPal/Venmo wordmarks.
  {
    label: 'Google Pay',
    img: '/payment-icons/google-pay-mark_800.svg',
    imgClassName: 'h-9 w-auto max-w-[60px] object-contain',
  },
  {
    label: 'Apple Pay',
    img: '/payment-icons/Apple_Pay_Mark_RGB_041619.svg',
    imgClassName: 'h-8 w-auto max-w-[56px] object-contain',
  },
];



function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center h-11 w-[68px] rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      {children}
    </span>
  );
}

function CardChip({ method }: { method: CardMethod }) {
  return (
    <Chip label={method.label}>
      <PaymentIcon type={method.type} format="flatRounded" width={56} />
    </Chip>
  );
}

function WalletChip({ method }: { method: WalletMethod }) {
  return (
    <Chip label={method.label}>
      {'custom' in method ? (
        method.custom === 'venmo' ? <VenmoMark /> : <PayPalMark />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={method.img}
          alt={method.label}
          className={method.imgClassName ?? 'max-h-7 max-w-[52px] object-contain'}
        />
      )}

    </Chip>
  );
}


/**
 * Accepted-payment brand logos.
 *  - `variant="cards"`  → Visa/Mastercard/Amex/Discover (card-entry modal sidebar).
 *  - `variant="wallets"`→ PayPal/Google Pay/Apple Pay.
 *  - `variant="both"` (default) → two captioned rows: "Cards" then "Wallets".
 *  - `columns={n}`     → render the chosen set as a fixed n-column grid (no caption).
 */
export function PaymentMethodLogos({
  className,
  variant = 'both',
  columns,
}: {
  className?: string;
  variant?: 'cards' | 'wallets' | 'both';
  columns?: number;
}) {
  const cardChips = CARD_METHODS.map((m) => <CardChip key={m.label} method={m} />);
  const walletChips = WALLET_METHODS.map((m) => <WalletChip key={m.label} method={m} />);

  // Grid layout (used by the modal sidebar) — single set, no captions.
  if (columns) {
    const chips = variant === 'wallets' ? walletChips : cardChips;
    return (
      <div
        className={className}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8 }}
      >
        {chips}
      </div>
    );
  }

  const Row = ({ caption, chips }: { caption: string; chips: React.ReactNode }) => (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{caption}</p>
      <div className="flex flex-wrap items-center gap-2">{chips}</div>
    </div>
  );

  if (variant === 'cards') {
    return (
      <div className={className}>
        <Row caption="Cards" chips={cardChips} />
      </div>
    );
  }
  if (variant === 'wallets') {
    return (
      <div className={className}>
        <Row caption="Wallets" chips={walletChips} />
      </div>
    );
  }

  // Default: two captioned rows.
  return (
    <div className={className}>
      <div className="space-y-3">
        <Row caption="Cards" chips={cardChips} />
        <Row caption="Wallets" chips={walletChips} />
      </div>
    </div>
  );
}
