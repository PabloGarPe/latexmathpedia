import { RichText } from "@/components/rich-text";

interface EjemBoxProps {
  title: string;
  children: React.ReactNode;
}

export function EjemBox({ title, children }: EjemBoxProps) {
  return (
    <div className="border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950/30 p-6 my-6 rounded-r-lg">
      <h4 className="font-bold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
        <span className="text-xl">✏️</span>
        <RichText content={title} variant="compact" />
      </h4>
      <div className="text-gray-700 dark:text-gray-300 prose prose-sm max-w-none">
        {children}
      </div>
    </div>
  );
}