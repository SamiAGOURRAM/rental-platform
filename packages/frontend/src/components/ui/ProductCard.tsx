import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';

interface ProductCardProps {
  id?: string;
  name: string;
  brand: string;
  category: string;
  pricePerDay: number;
  imageUrl?: string | null;
}

const defaultGradients = [
  'from-[#e8f0ed] to-[#f5f0e3]',
  'from-[#f5f0e3] to-[#e7e5e4]',
  'from-[#e7e5e4] to-[#f5f5f4]',
  'from-[#d6d3d1] to-[#e8f0ed]',
  'from-[#f5f0e3] to-[#fafaf9]',
  'from-[#e8f0ed] to-[#e7e5e4]',
  'from-[#e7e5e4] to-[#f5f0e3]',
  'from-[#f5f5f4] to-[#e8f0ed]',
];

function deterministicGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return defaultGradients[Math.abs(hash) % defaultGradients.length]!;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none">
      <path
        d="M7.5 13s-6-4.35-6-8a3.5 3.5 0 0 1 6-2.45A3.5 3.5 0 0 1 13.5 5c0 3.65-6 8-6 8z"
        fill="#1A3C34"
      />
    </svg>
  ) : (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none">
      <path
        d="M7.5 13s-6-4.35-6-8a3.5 3.5 0 0 1 6-2.45A3.5 3.5 0 0 1 13.5 5c0 3.65-6 8-6 8z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6.5" fill="#1A3C34" />
      <path d="M7.5 4.5v6M4.5 7.5h6" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M7.5 4.5v6M4.5 7.5h6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ActionButtons({
  id,
  name,
  brand,
  category,
  pricePerDay,
  imageUrl,
}: Required<Pick<ProductCardProps, 'id'>> & Omit<ProductCardProps, 'id'>) {
  const { isInCart, addItem, removeItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const inCart = isInCart(id);
  const faved = isFavorite(id);

  return (
    <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <button
        onClick={(e) => {
          e.preventDefault();
          toggleFavorite({ id, name, brand, category, pricePerDay, imageUrl: imageUrl ?? null });
        }}
        title={faved ? 'Remove from favorites' : 'Save to favorites'}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-sm transition-all duration-200',
          faved
            ? 'bg-white text-brand'
            : 'bg-white/90 text-charcoal backdrop-blur-sm hover:bg-white hover:text-brand',
        )}
      >
        <HeartIcon filled={faved} />
      </button>

      <button
        onClick={(e) => {
          e.preventDefault();
          if (inCart) {
            removeItem(id);
          } else {
            addItem({ id, name, brand, category, pricePerDay, imageUrl: imageUrl ?? null });
          }
        }}
        title={inCart ? 'Remove from capsule' : 'Add to capsule'}
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-sm transition-all duration-200',
          inCart
            ? 'bg-white text-brand'
            : 'bg-white/90 text-charcoal backdrop-blur-sm hover:bg-white hover:text-brand',
        )}
      >
        <PlusIcon active={inCart} />
      </button>
    </div>
  );
}

export function ProductCard({
  id,
  name,
  brand,
  category,
  pricePerDay,
  imageUrl,
}: ProductCardProps) {
  const gradient = deterministicGradient(id ?? name);
  const sharedClass =
    'group relative overflow-hidden rounded-xl bg-white shadow-lifted transition-all duration-300 hover:-translate-y-0.5 hover:shadow-hover';

  const imageArea = (
    <div className="relative aspect-[3/4] overflow-hidden">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${name} by ${brand}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
      ) : (
        <div className={`h-full w-full bg-gradient-to-br ${gradient}`} />
      )}
      {id && (
        <ActionButtons
          id={id}
          name={name}
          brand={brand}
          category={category}
          pricePerDay={pricePerDay}
          imageUrl={imageUrl}
        />
      )}
    </div>
  );

  const info = (
    <div className="p-4">
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-stone">
        {category}
      </span>
      <h3 className="mt-1 font-serif text-[20px] font-semibold leading-tight text-ink">{name}</h3>
      <p className="mt-0.5 font-sans text-[13px] text-stone">{brand}</p>
      <p className="mt-2 font-sans text-[15px] font-semibold text-ink">
        {pricePerDay}&thinsp;EUR <span className="font-normal text-stone">/ day</span>
      </p>
    </div>
  );

  if (id) {
    return (
      <Link to={`/collection/${id}`} className={`block ${sharedClass}`}>
        {imageArea}
        {info}
      </Link>
    );
  }

  return (
    <article className={sharedClass}>
      {imageArea}
      {info}
    </article>
  );
}
