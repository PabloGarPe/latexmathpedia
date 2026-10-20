import { RichText } from "@/components/rich-text";

interface EjBoxProps {
  title: string;
  children: React.ReactNode;
}

export function EjBox({ title, children }: EjBoxProps) {
  return (
    <div className="border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30 p-6 my-6 rounded-r-lg">
      <h4 className="font-bold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
        <span className="text-xl">💡</span>
        <RichText content={title} variant="compact" />
      </h4>
      <div className="text-gray-700 dark:text-gray-300 prose prose-sm max-w-none">
        {children}
      </div>
    </div>
  );
}