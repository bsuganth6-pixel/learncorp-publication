import Hero from '@/components/home/Hero';
import BookShelf from '@/components/home/BookShelf';
import PromoBanners from '@/components/home/PromoBanners';
import ServicesGrid from '@/components/home/ServicesGrid';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import FeaturedAuthors from '@/components/home/FeaturedAuthors';
import Stats from '@/components/home/Stats';
import Testimonials from '@/components/home/Testimonials';
import CTA from '@/components/home/CTA';

export default function HomePage() {
  return (
    <>
      <Hero />
      <BookShelf title="New & Featured" subtitle="Fresh off the press" viewAllHref="/books" />
      <BookShelf title="Fiction" category="Fiction" viewAllHref="/books?category=Fiction" />
      <BookShelf title="Business" category="Business" viewAllHref="/books?category=Business" />
      <PromoBanners />
      <ServicesGrid />
      <WhyChooseUs />
      <FeaturedAuthors />
      <Stats />
      <Testimonials />
      <CTA />
    </>
  );
}
