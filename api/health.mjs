import { hasKey } from './_youcam.mjs';

// Lets the page know whether live try-on is available or only the pre-rendered samples.
export default function handler(req, res) {
  res.status(200).json({ live: hasKey() });
}
