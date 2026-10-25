import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout, Protected, PageHead, Spinner } from "./components/common";
import HomePage from "./pages/HomePage";
import FlightsPage from "./pages/FlightsPage";
import FlightDetailPage from "./pages/FlightDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import BookingsPage, { BookingDetailPage } from "./pages/BookingsPage";
import { AuthPage, RecoveryPage } from "./pages/AuthPages";
import { FavoritesPage, ProfilePage } from "./pages/AccountPages";
import AssistantPage from "./pages/AssistantPage";
const AdminPage = lazy(() => import("./pages/AdminPage"));
export default function App() {
  const admin = (
    <Suspense fallback={<Spinner />}>
      <AdminPage />
    </Suspense>
  );
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Protected admin />}>
            <Route path="admin" element={admin} />
            <Route path="admin/:section" element={admin} />
          </Route>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="flights" element={<FlightsPage />} />
            <Route path="flights/:id" element={<FlightDetailPage />} />
            <Route path="login" element={<AuthPage />} />
            <Route path="register" element={<AuthPage register />} />
            <Route path="forgot-password" element={<RecoveryPage />} />
            <Route path="reset-password" element={<RecoveryPage reset />} />
            <Route element={<Protected />}>
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="bookings/:id" element={<BookingDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="assistant" element={<AssistantPage />} />
            </Route>
            <Route
              path="*"
              element={
                <div className="container page">
                  <PageHead
                    tag="404 · LẠC MẤT RỒI"
                    title="Chân trời này chưa có trong bản đồ."
                  />
                  <Link className="button" to="/">
                    Trở về trang chủ ↗
                  </Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
