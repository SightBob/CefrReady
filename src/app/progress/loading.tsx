/**
 * Loading skeleton for /progress — mirrors both Figma frames so the layout
 * does not jump when data arrives:
 *   desktop 172:454 — 447px left column (profile + history), 699px results panel
 *   mobile  172:7255 — single column, order profile → results → history
 *
 * The wrapper mirrors ProgressContent exactly: DOM order follows the mobile
 * reading order, and from lg up a 447/699 grid with explicit placement restores
 * the desktop frame.
 */
export default function Loading() {
  return (
    <div className="bg-[#f7f7f7] min-h-full">
      <div className="max-w-[1157px] mx-auto px-[17px] min-[992px]:px-0 py-[11px]">
        <div className="flex flex-col gap-[11px] min-[992px]:grid min-[992px]:grid-cols-[447px_699px] min-[992px]:grid-rows-[164px_419px] min-[992px]:items-start">
          {/* Profile card */}
          <div className="bg-white rounded-[16px] min-[992px]:rounded-[20px] pl-[16px] pr-[16px] pt-[14px] pb-[17px] min-[992px]:pl-[24px] min-[992px]:pr-[25px] min-[992px]:pt-[21px] flex items-center gap-[16px] min-[992px]:gap-[14px] h-[130px] min-[992px]:h-[164px] shrink-0">
            <div className="w-[101px] h-[100px] min-[992px]:w-[122px] min-[992px]:h-[122px] shrink-0 bg-[#f3f5f7] animate-pulse" />
            <div className="flex flex-col gap-[17px] min-[992px]:gap-[14px] w-[204px] min-[992px]:w-[260px]">
              <div className="flex flex-col gap-2 w-full min-[992px]:w-[243px]">
                <div className="h-5 w-full bg-[#f3f5f7] rounded animate-pulse" />
                <div className="h-3.5 w-2/3 bg-[#f3f5f7] rounded animate-pulse" />
              </div>
              <div className="bg-[#f3f5f7] rounded-[7px] h-[34px] w-[166px] min-[992px]:h-[47px] min-[992px]:w-full animate-pulse" />
            </div>
          </div>

          {/* Results panel */}
          <div className="bg-white rounded-[16px] min-[992px]:rounded-[20px] pb-[16px] pl-[17px] pr-[16px] pt-[15px] min-[992px]:pb-[14px] min-[992px]:pl-[19px] min-[992px]:pr-[22px] min-[992px]:pt-[16px] flex flex-col w-full shrink-0 min-[992px]:col-start-2 min-[992px]:row-start-1 min-[992px]:row-span-2 min-[992px]:h-full">
            <div className="flex flex-col gap-[10px] min-[992px]:gap-[12px] items-start w-full max-w-[658px] mx-auto">
              <div className="flex items-center justify-between w-full min-[992px]:justify-start">
                <div className="h-4 w-44 bg-[#f3f5f7] rounded animate-pulse" />
                <div className="h-[30px] w-[127px] bg-[#f8f7f2] rounded-[8px] animate-pulse lg:hidden" />
              </div>

              {/* One card on mobile — 172:7280 */}
              <div className="lg:hidden w-full">
                <div className="border border-[#ededed] rounded-[14px] px-[12px] pt-[8px] pb-[13px] pr-[14px] h-[166px] flex flex-col gap-[20px] animate-pulse">
                  <div className="flex flex-col gap-[16px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-[10px]">
                        <div className="size-[33px] shrink-0 bg-[#f3f5f7] rounded-[7px]" />
                        <div className="flex flex-col gap-1 w-[95px]">
                          <div className="h-4 w-full bg-[#f3f5f7] rounded" />
                          <div className="h-3 w-3/4 bg-[#f3f5f7] rounded" />
                        </div>
                      </div>
                      <div className="h-[30px] w-[84px] bg-[#edfce5] rounded-[8px]" />
                    </div>
                    <div className="flex flex-col gap-[4px]">
                      <div className="h-4 w-20 bg-[#f3f5f7] rounded" />
                      <div className="h-2 w-full bg-[#f3f5f7] rounded-full" />
                    </div>
                  </div>
                  <div className="bg-[#f3f5f7] rounded-[8px] h-[34px] w-full" />
                </div>
              </div>

              {/* 2-column grid on desktop — 172:566 */}
              <div className="hidden lg:grid lg:grid-cols-2 gap-x-[14px] gap-y-[14px] w-full">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="border border-[#ededed] rounded-[14px] px-[12px] pt-[8px] pb-[13px] pr-[14px] h-[168px] flex flex-col gap-[20px] animate-pulse"
                  >
                    <div className="flex flex-col gap-[16px]">
                      <div className="flex items-center gap-[10px]">
                        <div className="size-[33px] shrink-0 bg-[#f3f5f7] rounded-[7px]" />
                        <div className="flex flex-col gap-1 w-[95px]">
                          <div className="h-4 w-full bg-[#f3f5f7] rounded" />
                          <div className="h-3 w-3/4 bg-[#f3f5f7] rounded" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-[4px]">
                        <div className="h-4 w-20 bg-[#f3f5f7] rounded" />
                        <div className="h-2 w-full bg-[#f3f5f7] rounded-full" />
                      </div>
                    </div>
                    <div className="bg-[#f3f5f7] rounded-[8px] h-[34px] w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* History panel */}
          <div className="bg-white rounded-[16px] min-[992px]:rounded-[20px] pb-[18px] pl-[17px] pr-[15px] pt-[14px] min-[992px]:pb-[19px] min-[992px]:pl-[23px] min-[992px]:pr-[18px] min-[992px]:pt-[16px] flex flex-col min-[992px]:h-[419px] shrink-0 min-[992px]:col-start-1 min-[992px]:row-start-2">
            <div className="flex flex-col gap-[9px] min-[992px]:gap-[19px] items-center w-full max-w-[406px] mx-auto">
              <div className="flex flex-col gap-[9px] min-[992px]:gap-[13px] w-full min-[992px]:flex-1 min-h-0">
                <div className="flex items-center justify-between w-full">
                  <div className="h-4 w-40 bg-[#f3f5f7] rounded animate-pulse" />
                  <div className="h-[30px] w-[90px] bg-[#f8f7f2] rounded-[8px] animate-pulse" />
                </div>
                {/* Mobile shows 4 rows (291px); desktop fills the 280px rail. */}
                <div className="bg-[#f3f5f7] rounded-[10px] min-[992px]:rounded-[14px] px-[10px] py-[14px] flex flex-col gap-[14px] min-[992px]:gap-[10px] max-h-[291px] min-[992px]:max-h-none min-[992px]:flex-1 min-h-0 overflow-hidden">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-[11px] h-[44px] items-center w-full">
                      <div className="bg-white h-full w-[116px] min-[992px]:w-[174px] shrink-0 rounded-[7px] animate-pulse" />
                      <div className="bg-white h-full w-[61px] min-[992px]:w-[88px] shrink-0 rounded-[7px] animate-pulse" />
                      <div className="bg-white h-full w-[61px] shrink-0 rounded-[7px] animate-pulse" />
                      <div className="size-[26px] shrink-0 rounded-[7px] bg-[#dbe9f4] animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#fff0ae] rounded-[10px] h-[42px] w-full shrink-0 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}