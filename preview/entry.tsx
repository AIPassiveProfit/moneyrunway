/**
 * Preview build entry point.
 *
 * This bundles the real dashboard — the same engine, the same components — into
 * a single self-contained HTML file that can be opened anywhere without
 * installing anything. It exists so the owner can tap the app on a phone before
 * we put it on a real server.
 *
 * It is a viewer, not the product. The deployed app is what ships.
 */
import { createRoot } from 'react-dom/client';

import Dashboard from '@/app/page';

const el = document.getElementById('root');
if (el) createRoot(el).render(<Dashboard />);
