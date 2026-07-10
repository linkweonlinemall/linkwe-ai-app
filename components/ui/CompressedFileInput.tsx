"use client";

import type { ChangeEvent, ComponentProps } from "react";

import Input from "@/components/ui/Input";
import { compressFileListIntoInput } from "@/lib/images/compress-image";

type Props = ComponentProps<typeof Input>;

/**
 * Drop-in replacement for `<Input type="file">` inside a native
 * `<form action={serverAction}>` (e.g. a Server Component page). Compresses
 * selected images client-side and writes them back onto the input before the
 * form submits, so the server action's field name/behavior is unchanged.
 */
export default function CompressedFileInput(props: Props) {
  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      await compressFileListIntoInput(e.target, files);
    }
    props.onChange?.(e);
  }

  return <Input {...props} type="file" onChange={handleChange} />;
}
