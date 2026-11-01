import { Link } from 'react-router-dom';
import { STATE_MESSAGES } from '../data/content';
import { StateBlock } from '../components/ui';

export function NotFound() {
  return (
    <section className="section">
      <div className="container">
        <StateBlock
          title="Page not found"
          body={STATE_MESSAGES.notFound}
          action={<Link className="btn btn--primary" to="/">Return Home</Link>}
        />
      </div>
    </section>
  );
}
