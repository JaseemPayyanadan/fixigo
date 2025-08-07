import { AuthGuard } from "@/components";
import RBACDemo from "@/components/RBACDemo";

export default function RBACDemoPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <RBACDemo />
      </div>
    </AuthGuard>
  );
} 