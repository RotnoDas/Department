import Loading from "@/components/common/Loading";

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#030712] transition-colors duration-300">
      <Loading 
        text="Loading Department Portal..." 
        subtext="Synchronizing academic records & campus systems"
        fullScreen
      />
    </div>
  );
}
