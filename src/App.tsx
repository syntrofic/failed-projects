import { Route, Routes } from 'react-router';
import { SiteLayout } from '@/components/site/site-layout';
import HomePage from '@/pages/home';
import ProductsPage from '@/pages/products';
import AboutPage from '@/pages/about';
import BlogPage from '@/pages/blog';
import NotFoundPage from '@/pages/not-found';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
