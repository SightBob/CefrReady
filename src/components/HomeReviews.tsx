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
  comment: string;
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
  if (parts.length === 1) {
    const p = parts[0];
    return p.length <= 2 ? `${p[0]}.` : `${p.slice(0, 2)}${'•'.repeat(Math.min(3, p.length - 2))}`;
  }
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${first} ${lastInitial}.`;
}

function ReviewCard({ r }: { r: Review }) {
  return (
    <figure className="flex h-full flex-col rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-slate-200 backdrop-blur">
      <div className="">
        <span className='text-[4rem] font-ibm text-[#A3AAC6] leading-none'>“</span>
        <blockquote className="line-clamp-6 text-sm text-[#48507C]">
          
          “{r.comment}”
        </blockquote>
      </div>

     
      <div className="mt-auto">
         <div className="h-[2px] bg-[#F2F2F2] w-full"></div>
        <figcaption className=" flex items-center gap-3 mt-6">
        {r.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.image}
            alt={r.name}
            className="h-9 w-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
            {initials(r.name)}
          </span>
        )}
        <div className="flex items-center justify-between w-full">
          <div className='flex flex-col'>
            <span className="text-sm font-semibold text-slate-800">{maskName(r.name)}</span>
          <span className="text-xs text-slate-400">
            {new Date(r.createdAt).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          </div>
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
    640: { slidesPerView: 2, spaceBetween: 20 },
    1024: { slidesPerView: 3, spaceBetween: 24 },
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
      "
    >
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="font-ibm text-4xl font-bold text-[#48507C] ">
            รีวิวจากผู้ใช้จริง
          </h2>
        </div>

        <div className="relative flex items-center gap-3">
          <button
            type="button"
            aria-label="รีวิวก่อนหน้า"
            className="reviews-swiper-prev relative z-20 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
            className="reviews-swiper-next relative z-20 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}