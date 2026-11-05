import { useEffect } from 'react'
import { HeroSection } from '../components/HeroSection'
import {
  BestSellerRail,
  CategoryTiles,
  MarqueeStrip,
  RecentlyViewedSection,
  ReviewsWall,
  TopRatedRail,
} from '../components/HomeSections'
import { useCatalog, useFeatured } from '../hooks/useCatalog'
import { CatalogSection } from './CatalogPage'

/** MP 001 · Trang Chủ Chợ Đồ Chơi */
export function HomePage() {
  const featured = useFeatured(5)
  const newest = useCatalog({ page: 0, size: 5, sort: 'newest' }, featured.isSuccess && !featured.data.items.length)
  const heroItems = featured.data?.items.length ? featured.data.items : (newest.data?.items ?? [])

  useEffect(() => {
    document.title = 'Chợ Đồ Chơi · 3DWorld'
  }, [])

  return (
    <>
      <HeroSection featured={heroItems} />
      <MarqueeStrip />
      <CategoryTiles />
      <BestSellerRail />
      <TopRatedRail />
      <RecentlyViewedSection />
      <section id="catalog" className="mt-20 scroll-mt-24" aria-label="Khám phá vật phẩm">
        <CatalogSection />
      </section>
      <ReviewsWall />
    </>
  )
}
