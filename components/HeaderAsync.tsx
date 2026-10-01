import { getStatusCounts } from "@/lib/queries";
import Header from "./Header";

// Isolated in its own Server Component so the root layout can wrap it in
// <Suspense> — without this, the layout's own await of getStatusCounts()
// blocked React from starting the page's data fetch until the counts query
// finished, turning every navigation into two sequential round trips
// instead of two parallel ones.
export default async function HeaderAsync() {
  const counts = await getStatusCounts();
  return <Header counts={counts} />;
}
