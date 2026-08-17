'use client';

import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, FreeMode } from 'swiper/modules';
import type { SwiperOptions } from 'swiper/types';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface Review {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  name: string;
  image: string | null;
}

interface ReviewsResponse {
  success: boolean;
  data?: Review[];
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`rating ${rating} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${i < rating ? 'text-amber-400' : 'text-slate-300'}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.42 4.36a1 1 0 0 0 .95.69h4.59c.97 0 1.37 1.24.59 1.81l-3.72 2.7a1 1 0 0 0-.36 1.12l1.42 4.36c.3.92-.75 1.69-1.54 1.12l-3.72-2.7a1 1 0 0 0-1.18 0l-3.72 2.7c-.79.57-1.84-.2-1.54-1.12l1.42-4.36a1 1 0 0 0-.36-1.12l-3.72-2.7c-.78-.57-.38-1.81.59-1.81h4.59a1 1 0 0 0 .95-.69L9.05 2.93Z" />
        </svg>
      ))}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'นักเรียน CefrReady';
  const first = parts[0];
  const maskedFirst =
    first.length <= 2
      ? `${first[0]}.`
      : `${first.slice(0, 2)}${'•'.repeat(Math.min(3, first.length - 2))}`;
  if (parts.length === 1) return maskedFirst;
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${maskedFirst} ${lastInitial}.`;
}

function ReviewCard({ r }: { r: Review }) {
  return (
  <figure className="flex h-full flex-col rounded-2xl bg-white/80 p-5 sm:p-6 shadow-sm ring-1 ring-slate-200 backdrop-blur min-h-[16.375rem] w-full min-w-0 sm:min-w-[25.625rem]">
  <div className="">
    {r.comment ? (
      <>
        <span className='text-5xl sm:text-[4rem] font-ibm text-[#A3AAC6]/40 leading-none'>“</span>
        <blockquote className="line-clamp-6 text-[1.125rem] text-[#48507C]">
          “{r.comment}”
        </blockquote>
      </>
    ) : (
      <div className="flex items-center gap-2 min-h-[4rem]">
        <Stars rating={r.rating} />
        <span className="text-sm text-slate-400">{r.rating}/5</span>
      </div>
    )}
  </div>

  <div className="mt-auto">
    <div className="h-[2px] bg-[#F2F2F2] w-full"></div>
    <figcaption className="flex items-center gap-3 mt-6">
      {r.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.image}
          alt={maskName(r.name)}
          className="h-9 w-9 rounded-full object-cover shrink-0"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
          {initials(r.name)}
        </span>
      )}
      <div className="flex items-center justify-between w-full min-w-0">
        <span className="text-sm font-semibold text-slate-800 truncate">{maskName(r.name)}</span>
        <Stars rating={r.rating} />
      </div>
    </figcaption>
  </div>
</figure>
  );
}

const swiperConfig: SwiperOptions = {
  modules: [Navigation, Pagination, Autoplay, FreeMode],
  slidesPerView: 1,
  spaceBetween: 16,
  grabCursor: true,
  freeMode: { enabled: true, sticky: false },
  navigation: {
    nextEl: '.reviews-swiper-next',
    prevEl: '.reviews-swiper-prev',
  },
  pagination: { clickable: true },
  autoplay: { delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true },
  breakpoints: {
    881: { slidesPerView: 2, spaceBetween: 20 },
    1310: { slidesPerView: 3, spaceBetween: 24 },
  },
};

export default function HomeReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/reviews')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: ReviewsResponse | null) => {
        if (cancelled || !json?.success || !Array.isArray(json.data)) return;
        setReviews(json.data);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || reviews.length === 0) return null;

  return (
    <section
  className="
    relative
    mb-5
    w-full
    isolate
    before:absolute
    before:inset-0
    before:-z-10
    before:bg-[linear-gradient(180deg,#D2D2D2_78%,#FFFFFF_100%)]
    before:opacity-[16%]
    pt-20
  "
>
  <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
    <div className="">
      <h2 className="font-ibm text-2xl sm:text-3xl md:text-[2.375rem] font-bold text-[#48507C] ">
        รีวิวจากผู้ใช้จริง
      </h2>
    </div>

    <div className="relative flex items-center gap-3 mt-[5px]">
      <button
        type="button"
        aria-label="รีวิวก่อนหน้า"
        className="reviews-swiper-prev !size-[2.625rem] absolute left-[-18px] top-[45%] translate-y-[-45%] z-20 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
      >
        <svg viewBox="0 0 24 24" className="w-[24px]" fill="none" stroke="#7372DF" strokeWidth="2" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="reviews-swiper min-w-0 flex-1">
        <Swiper {...swiperConfig} className="!px-1 !pb-2">
          {reviews.map((r) => (
            <SwiperSlide key={r.id} className="!h-auto py-3">
              <ReviewCard r={r} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <button
        type="button"
        aria-label="รีวิวถัดไป"
        className="reviews-swiper-next !size-[2.625rem] absolute right-[-18px] top-[45%] translate-y-[-45%] z-20 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
      >
        <svg viewBox="0 0 24 24" className="w-[24px]" fill="none" stroke="#7372DF" strokeWidth="2" aria-hidden="true">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  </div>
</section>
  );
}