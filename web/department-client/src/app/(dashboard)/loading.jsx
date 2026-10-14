import Loading from "@/components/common/Loading";

export default function DashboardLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center w-full">
      <Loading 
        text="Loading Workspace..." 
        subtext="Fetching department privileges & live data"
        fullScreen
      />
    </div>
  );
}
