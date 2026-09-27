import { useAuth } from '../hooks/useAuth';
import { TasksPage } from './TasksPage';
import { ComingSoonPage } from './ComingSoonPage';

export function TasksRoute() {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return (
      <ComingSoonPage
        title="Tasks"
        description="An admin-specific Tasks view is coming in a later phase."
      />
    );
  }
  return <TasksPage />;
}
