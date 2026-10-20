import { RichText } from "@/components/rich-text";

interface DemBoxProps {
  title: string;
  children: React.ReactNode;
}

export function DemBox({ title, children }: DemBoxProps) {
  return (
    <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-6 my-6 rounded-r-lg max-w-full">
      <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
        <span className="text-xl">📐</span>
        <RichText content={title} variant="compact" />
      </h4>
      <div className="text-gray-700 dark:text-gray-300 prose prose-sm max-w-none [&_.katex-display]:overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
