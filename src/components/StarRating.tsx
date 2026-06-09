'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
};

export default function StarRating({ value, onChange, disabled = false, size = 'md' }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverValue || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => !disabled && setHoverValue(star)}
            onMouseLeave={() => !disabled && setHoverValue(0)}
            className={`transition-colors ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'} ${
              isFilled ? 'text-amber-400' : 'text-slate-200'
            }`}
            aria-label={`${star} ดาว`}
          >
            <Star className={`${SIZE_MAP[size]} fill-current`} />
          </button>
        );
      })}
    </div>
  );
}
