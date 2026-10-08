import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Braces, Check, ChevronLeft, ChevronRight, Clipboard, Copy, Eye, FileJson, FilePlus2, History, ImagePlus, Layers, ListFilter, Pause, Pencil, Play, Plus, RotateCcw, Save, Search, Shuffle, Trash2, Upload, X } from "lucide-react";

const commands = [
  [/delete|remove|discard/i, Trash2], [/cancel|close|did not know/i, X], [/save|update/i, Save],
  [/download|export/i, ArrowDownToLine], [/import|upload/i, Upload], [/json|structure/i, FileJson],
  [/copy/i, Copy], [/paste/i, Clipboard], [/image|screenshot/i, ImagePlus],
  [/format/i, Braces],
  [/preview|reveal|show.*answer|show.*solution/i, Eye], [/edit|rename/i, Pencil],
  [/\bnew.*page|\bnew.*note|\bnew.*topic|\bnew.*subtopic/i, FilePlus2], [/\b(add|new|create)\b/i, Plus],
  [/previous/i, ChevronLeft], [/next/i, ChevronRight], [/back|return/i, ArrowLeft],
  [/reset|retry|restart|refresh|clear|flip/i, RotateCcw], [/shuffle|random/i, Shuffle],
  [/start|practice|study|run|play|continue|drill/i, Play], [/pause|stop/i, Pause],
  [/complete|finish|confirm|knew|correct/i, Check], [/history|review/i, History],
  [/search|find/i, Search], [/filter|archived|selected/i, ListFilter], [/flashcard|deck|session/i, Layers],
  [/article|read|source/i, BookOpen], [/open/i, ArrowRight]
] as const;

export function ActionIcon({ label }: { label: string }) {
  const Icon = commands.find(([pattern]) => pattern.test(label))?.[1];
  return Icon ? <Icon className="action-icon" size={15} aria-hidden="true" /> : null;
}
