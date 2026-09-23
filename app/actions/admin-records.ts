"use server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { RECORD_FIELDS, type RecordKind } from "@/lib/admin/record-fields";
import { RECORD_SECTIONS, type RecordField } from "@/lib/admin/record-design";
import {
  RecordValidationError,
  validateRecordValues,
  validateRecordState,
  safeUrl,
} from "@/lib/admin/record-validation";
import { LISTING_DETAIL_MODELS } from "@/lib/admin/listing-details";
import { revalidatePath } from "next/cache";
import { canVendorUsePayOnArrival } from "@/lib/services/payment-policy";
import { uploadFile } from "@/lib/uploads/upload";

async function admin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    throw new Error("Administrator access required.");
  return session;
}
function modelFields(name: string, names?: readonly string[]): RecordField[] {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === name)!;
  return model.fields
    .filter(
      (f) =>
        f.kind !== "object" &&
        (names
          ? names.includes(f.name)
          : !["id", "listingId", "createdAt", "updatedAt"].includes(f.name)),
    )
    .map((f) => ({
      name: f.name,
      type: f.type,
      required: f.isRequired,
      list: f.isList,
      options:
        f.kind === "enum"
          ? Prisma.dmmf.datamodel.enums
              .find((e) => e.name === f.type)
              ?.values.map((v) => v.name)
          : undefined,
      value: f.isList
        ? []
        : typeof f.default === "string" ||
            typeof f.default === "number" ||
            typeof f.default === "boolean"
          ? f.default
          : null,
    }));
}
function fields(kind: RecordKind) {
  if (!Object.hasOwn(RECORD_FIELDS, kind))
    throw new Error("Unknown record type.");
  const visible = RECORD_SECTIONS[kind].flatMap((section) => section.fields);
  return modelFields(
    kind === "service" || kind === "product"
      ? "Product"
      : kind[0].toUpperCase() + kind.slice(1),
    RECORD_FIELDS[kind],
  ).filter((f) => visible.includes(f.name));
}
const extra = (
  name: string,
  type = "Json",
  list = false,
  value: unknown = null,
  required = false,
): RecordField => ({ name, type, list, required, value });
function jsonData(data: Record<string, unknown>, metadata: RecordField[]) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value == null && metadata.find((f) => f.name === key)?.type === "Json"
        ? Prisma.DbNull
        : value,
    ]),
  );
}
async function loadRecord(
  tx: Prisma.TransactionClient,
  kind: RecordKind,
  id: string,
) {
  if (kind === "product" || kind === "service")
    return tx.product.findUnique({
      where: { id, isService: kind === "service" },
      include: {
        variants: { orderBy: { createdAt: "asc" } },
        store: { select: { id: true, name: true, slug: true } },
      },
    });
  if (kind === "store")
    return tx.store.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        owner: { select: { id: true, fullName: true, email: true } },
      },
    });
  if (kind === "user")
    return tx.user.findUnique({
      where: { id },
      select: {
        id: true,
        updatedAt: true,
        fullName: true,
        email: true,
        phone: true,
        region: true,
        role: true,
        isActive: true,
        suspended: true,
        emailVerified: true,
        idVerificationStatus: true,
        bankDetails: true,
        storesOwned: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });
  return tx.listing.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true, slug: true } },
      listingProduct: true,
      realEstate: true,
      vehicle: true,
      event: true,
      service: true,
      restaurant: true,
      place: true,
      ticket: true,
      digital: true,
      bookable: true,
    },
  });
}
export async function getAdminRecordWorkspace(kind: RecordKind, id: string) {
  await admin();
  const isNew = id === "new";
  const metadata = fields(kind);
  const record = isNew ? null : await loadRecord(prisma, kind, id);
  if (!isNew && !record) return null;
  const data = record as unknown as Record<string, unknown> | null;
  const formFields = metadata.map((f) => ({
    ...f,
    value: data ? (data[f.name] ?? null) : f.value,
    ...(f.name === "type" && !isNew ? { readonly: true } : {}),
  }));
  if (kind === "user") {
    formFields.push(
      extra("bankDetails", "Json", false, data?.bankDetails ?? null),
    );
    if (isNew) formFields.push(extra("password", "Password", false, "", true));
  }
  if (kind === "store")
    formFields.push(
      extra(
        "storeGallery",
        "String",
        true,
        (data?.images as { url: string }[] | undefined)?.map(
          (image) => image.url,
        ) ?? [],
      ),
    );
  if (kind === "product")
    formFields.push(extra("variants", "Json", false, data?.variants ?? []));
  if (kind === "service" && isNew) {
    formFields.find((f) => f.name === "serviceType")!.value = "QUOTE";
    formFields.find((f) => f.name === "quotePriceType")!.value = "FREE_QUOTE";
    formFields.find((f) => f.name === "serviceDuration")!.value = 60;
  }
  if (kind === "listing" && isNew)
    formFields.find((f) => f.name === "currency")!.value = "TTD";
  if (isNew && kind !== "user")
    formFields.unshift(
      extra(
        kind === "store" ? "ownerId" : "storeId",
        "String",
        false,
        "",
        true,
      ),
    );
  const detailFields = Object.fromEntries(
    Object.entries(LISTING_DETAIL_MODELS).map(([type, config]) => [
      type,
      modelFields(config.model),
    ]),
  );
  if (kind === "listing") {
    const config =
      LISTING_DETAIL_MODELS[
        String(data?.type || "PRODUCT") as keyof typeof LISTING_DETAIL_MODELS
      ];
    const detail = data?.[config.relation] as
      | Record<string, unknown>
      | undefined;
    formFields.push(
      extra(
        "listingDetails",
        "Json",
        false,
        detail
          ? Object.fromEntries(
              detailFields[String(data?.type || "PRODUCT")].map((f) => [
                f.name,
                detail[f.name],
              ]),
            )
          : {},
      ),
    );
  }
  const links: { label: string; href: string }[] = [];
  const store = data?.store as
    | { id: string; name: string; slug: string }
    | undefined;
  const owner = data?.owner as
    | { id: string; fullName: string; email: string }
    | undefined;
  if (store)
    links.push({
      label: store.name,
      href: `/dashboard/admin/records/store/${store.id}`,
    });
  if (owner)
    links.push({
      label: `Owner: ${owner.fullName}`,
      href: `/dashboard/admin/records/user/${owner.id}`,
    });
  if (kind === "user")
    for (const owned of (data?.storesOwned as { id: string; name: string }[]) ||
      [])
      links.push({
        label: owned.name,
        href: `/dashboard/admin/records/store/${owned.id}`,
      });
  if (!isNew && kind === "store")
    links.push(
      { label: "Products", href: `/dashboard/admin/products?storeId=${id}` },
      { label: "Services", href: `/dashboard/admin/services?storeId=${id}` },
      { label: "Vendor & finance", href: "/dashboard/admin?tab=vendors" },
    );
  if (!isNew && kind === "user")
    links.push({
      label: "Verification desk",
      href: "/dashboard/admin/verification",
    });
  const publicHref = data?.slug
    ? kind === "store"
      ? `/store/${data.slug}`
      : kind === "product"
        ? `/products/${data.slug}`
        : kind === "service"
          ? `/service/${data.slug}`
          : null
    : null;
  const [users, stores] =
    isNew && kind !== "user"
      ? await Promise.all([
          kind === "store"
            ? prisma.user.findMany({
                where: {
                  isActive: true,
                  suspended: false,
                  storesOwned: { none: {} },
                },
                select: { id: true, fullName: true, email: true },
                orderBy: { fullName: "asc" },
              })
            : [],
          kind !== "store"
            ? prisma.store.findMany({
                select: { id: true, name: true },
                orderBy: { name: "asc" },
              })
            : [],
        ])
      : [[], []];
  return JSON.parse(
    JSON.stringify({
      fields: formFields,
      version: data?.updatedAt ?? null,
      title: data?.name || data?.fullName || data?.title || `New ${kind}`,
      publicHref,
      links,
      users,
      stores,
      detailFields,
      verification:
        kind === "user" && data
          ? {
              identity: data.idVerificationStatus,
              emailVerified: !!data.emailVerified,
            }
          : null,
      billing:
        kind === "store" && data
          ? {
              plan: data.subscriptionPlan,
              status: data.subscriptionStatus,
              renewsAt: data.planRenewsAt,
            }
          : null,
    }),
  ) as AdminRecordWorkspace;
}
export type AdminRecordWorkspace = {
  fields: RecordField[];
  version: string | null;
  title: string;
  publicHref: string | null;
  links: { label: string; href: string }[];
  users: { id: string; fullName: string; email: string }[];
  stores: { id: string; name: string }[];
  detailFields: Record<string, RecordField[]>;
  verification: { identity: string; emailVerified: boolean } | null;
  billing: { plan: string; status: string; renewsAt: string | null } | null;
};
// Compatibility for existing links and consumers; all editing uses the same validated workspace.
export async function getAdminEditableRecord(kind: RecordKind, id: string) {
  return (await getAdminRecordWorkspace(kind, id))?.fields ?? [];
}

type VariantInput = {
  id?: string;
  name: string;
  sku: string | null;
  price: number | null;
  stock: number | null;
  images: string[];
  attributes: Prisma.InputJsonValue;
};
function parseVariants(raw: unknown): VariantInput[] {
  if (!Array.isArray(raw) || raw.length > 100)
    throw new RecordValidationError({ variants: "Use up to 100 variations." });
  const parsed = raw.map((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      typeof row.name !== "string" ||
      !row.name.trim()
    )
      throw new RecordValidationError({
        variants: "Every variation needs a name.",
      });
    const price =
        row.price === "" || row.price == null ? null : Number(row.price),
      stock = row.stock === "" || row.stock == null ? null : Number(row.stock);
    if (
      (price != null && (!Number.isFinite(price) || price < 0)) ||
      (stock != null && (!Number.isInteger(stock) || stock < 0))
    )
      throw new RecordValidationError({
        variants: "Check each variation's price and whole-number stock.",
      });
    if (
      !Array.isArray(row.images) ||
      row.images.some(
        (url: unknown) => typeof url !== "string" || !safeUrl(url),
      ) ||
      !row.attributes ||
      typeof row.attributes !== "object" ||
      Array.isArray(row.attributes)
    )
      throw new RecordValidationError({
        variants: "Check variation images and attributes.",
      });
    if (Object.values(row.attributes).some((v) => typeof v !== "string"))
      throw new RecordValidationError({
        variants: "Variation attributes must be text.",
      });
    return {
      ...(row.id ? { id: String(row.id) } : {}),
      name: row.name.trim().slice(0, 150),
      sku: row.sku ? String(row.sku).trim().slice(0, 100) : null,
      price,
      stock,
      images: row.images as string[],
      attributes: row.attributes as Prisma.InputJsonValue,
    };
  });
  const ids = parsed.flatMap((row) => (row.id ? [row.id] : []));
  if (new Set(ids).size !== ids.length)
    throw new RecordValidationError({
      variants: "A variation appears more than once.",
    });
  return parsed;
}

export async function saveAdminEditableRecord(
  kind: RecordKind,
  id: string,
  values: Record<string, unknown>,
  version?: string | null,
) {
  const session = await admin();
  try {
    const isNew = id === "new";
    const metadata = fields(kind);
    const extended = [...metadata];
    if (kind === "store") extended.push(extra("storeGallery", "String", true));
    if (kind === "product") extended.push(extra("variants"));
    if (kind === "user") {
      extended.push(extra("bankDetails"));
      if (isNew)
        extended.push(extra("password", "Password", false, null, true));
    }
    if (kind === "listing") extended.push(extra("listingDetails"));
    if (isNew && kind !== "user")
      extended.push(
        extra(
          kind === "store" ? "ownerId" : "storeId",
          "String",
          false,
          null,
          true,
        ),
      );
    const parsed = validateRecordValues(extended, values);
    if (isNew) {
      const missing = extended
        .filter(
          (f) =>
            f.required && !Object.hasOwn(parsed, f.name) && f.value == null,
        )
        .map((f) => f.name);
      if (missing.length)
        throw new RecordValidationError(
          Object.fromEntries(
            missing.map((name) => [name, "Complete this required field."]),
          ),
        );
    }
    const {
      storeGallery,
      variants,
      bankDetails,
      listingDetails,
      password,
      ownerId,
      storeId,
      ...base
    } = parsed;
    if (base.role === "COURIER")
      throw new RecordValidationError({
        role: "Choose Customer, Vendor or Administrator.",
      });
    const variantRows = variants == null ? null : parseVariants(variants);
    const passwordHash =
      isNew && kind === "user" ? await hashPassword(String(password)) : null;
    const saved = await prisma.$transaction(
      async (tx) => {
        const currentRecord = isNew ? null : await loadRecord(tx, kind, id);
        if (!isNew && !currentRecord)
          throw new Error("This record no longer exists.");
        const current = currentRecord as unknown as Record<
          string,
          unknown
        > | null;
        if (
          !isNew &&
          (!version ||
            (current?.updatedAt instanceof Date
              ? current.updatedAt.toISOString()
              : new Date(String(current?.updatedAt)).toISOString()) !== version)
        )
          throw new Error(
            "Someone has updated this record since you opened it. Reload the page to review their changes before saving.",
          );
        const defaults = Object.fromEntries(
          metadata.map((f) => [f.name, f.value]),
        );
        const merged = { ...defaults, ...current, ...parsed };
        validateRecordState(kind, merged, Object.keys(parsed));
        const data = jsonData(base, metadata);
        let savedId = id;
        if (kind === "user") {
          if (!isNew && current) {
            const losesAccess =
              merged.role !== "ADMIN" ||
              merged.isActive === false ||
              merged.suspended === true;
            if (
              id === session.userId &&
              (merged.role !== current.role ||
                merged.isActive === false ||
                merged.suspended === true)
            )
              throw new Error(
                "Another administrator must change your own access so you can finish your work safely.",
              );
            if (
              current.role === "ADMIN" &&
              losesAccess &&
              (await tx.user.count({
                where: { role: "ADMIN", isActive: true, suspended: false },
              })) <= 1
            )
              throw new Error("Keep at least one active administrator.");
            if (data.email && data.email !== current.email)
              Object.assign(data, {
                emailVerified: null,
                emailVerifyToken: null,
                emailVerifyTokenExpiry: null,
                resetToken: null,
                resetTokenExpiry: null,
              });
          }
          if (isNew)
            savedId = (
              await tx.user.create({
                data: {
                  ...data,
                  passwordHash,
                } as Prisma.UserUncheckedCreateInput,
                select: { id: true },
              })
            ).id;
          else
            await tx.user.update({
              where: { id },
              data: {
                ...data,
                updatedAt: new Date(),
              } as Prisma.UserUpdateInput,
            });
          if (bankDetails != null) {
            const bank = bankDetails as Record<string, unknown>;
            if (merged.role !== "VENDOR")
              throw new RecordValidationError({
                bankDetails:
                  "Payout details can only be saved for vendor accounts.",
              });
            if (
              ["bankName", "accountName", "accountNumber"].some(
                (key) =>
                  typeof bank[key] !== "string" || !String(bank[key]).trim(),
              )
            )
              throw new RecordValidationError({
                bankDetails:
                  "Enter the bank, account holder and account number.",
              });
            const accountTypes = Prisma.dmmf.datamodel.enums
              .find((e) => e.name === "AccountType")!
              .values.map((v) => v.name);
            if (
              bank.accountType &&
              !accountTypes.includes(String(bank.accountType))
            )
              throw new RecordValidationError({
                bankDetails: "Choose a valid bank account type.",
              });
            const details = {
              bankName: String(bank.bankName).trim(),
              accountName: String(bank.accountName).trim(),
              accountNumber: String(bank.accountNumber).trim(),
              accountType: bank.accountType || null,
            };
            await tx.vendorBankDetails.upsert({
              where: { userId: savedId },
              create: {
                ...details,
                userId: savedId,
              } as Prisma.VendorBankDetailsUncheckedCreateInput,
              update: details as Prisma.VendorBankDetailsUpdateInput,
            });
          }
        } else if (kind === "store") {
          if (isNew) {
            const owner = await tx.user.findUnique({
              where: { id: String(ownerId) },
              select: {
                id: true,
                role: true,
                isActive: true,
                suspended: true,
                storesOwned: { select: { id: true } },
              },
            });
            if (
              !owner ||
              !owner.isActive ||
              owner.suspended ||
              owner.storesOwned.length
            )
              throw new RecordValidationError({
                ownerId:
                  "Choose an active owner who does not already have a store.",
              });
            savedId = (
              await tx.store.create({
                data: {
                  ...data,
                  ownerId: owner.id,
                } as Prisma.StoreUncheckedCreateInput,
                select: { id: true },
              })
            ).id;
            if (owner.role !== "ADMIN" && owner.role !== "VENDOR")
              await tx.user.update({
                where: { id: owner.id },
                data: { role: "VENDOR" },
              });
          } else
            await tx.store.update({
              where: { id },
              data: {
                ...data,
                updatedAt: new Date(),
              } as Prisma.StoreUpdateInput,
            });
          if (Array.isArray(storeGallery)) {
            await tx.storeImage.deleteMany({ where: { storeId: savedId } });
            if (storeGallery.length)
              await tx.storeImage.createMany({
                data: storeGallery.map((url, position) => ({
                  storeId: savedId,
                  url: String(url),
                  position,
                })),
              });
          }
        } else if (kind === "product" || kind === "service") {
          if (kind === "service" && (isNew || data.serviceType))
            data.isBookable = ["BOOKABLE", "VIRTUAL"].includes(
              String(merged.serviceType),
            );
          if (
            kind === "service" &&
            (isNew || data.serviceType || data.bookingPaymentMode)
          ) {
            const serviceStore = await tx.store.findUnique({
              where: { id: String(isNew ? storeId : current?.storeId) },
              select: { subscriptionPlan: true, subscriptionStatus: true },
            });
            if (
              merged.serviceType === "VIRTUAL" ||
              !serviceStore ||
              !canVendorUsePayOnArrival(
                serviceStore.subscriptionPlan,
                serviceStore.subscriptionStatus,
              )
            )
              data.bookingPaymentMode = "ONLINE_ONLY";
          }
          if (isNew) {
            if (
              !(await tx.store.findUnique({
                where: { id: String(storeId) },
                select: { id: true },
              }))
            )
              throw new RecordValidationError({
                storeId: "Choose an existing store.",
              });
            savedId = (
              await tx.product.create({
                data: {
                  ...data,
                  storeId: String(storeId),
                  isService: kind === "service",
                  images: data.images || [],
                  tags: data.tags || [],
                } as Prisma.ProductUncheckedCreateInput,
                select: { id: true },
              })
            ).id;
          } else
            await tx.product.update({
              where: { id, isService: kind === "service" },
              data: {
                ...data,
                updatedAt: new Date(),
              } as Prisma.ProductUpdateInput,
            });
          if (variantRows) {
            const existing = await tx.productVariant.findMany({
              where: { productId: savedId },
              select: { id: true },
            });
            if (
              variantRows.some(
                (row) => row.id && !existing.some((v) => v.id === row.id),
              ) ||
              existing.some((row) => !variantRows.some((v) => v.id === row.id))
            )
              throw new RecordValidationError({
                variants:
                  "Existing variations must be kept. Set their stock to zero to retire them.",
              });
            for (const row of variantRows) {
              const { id: variantId, ...details } = row;
              if (variantId)
                await tx.productVariant.update({
                  where: { id: variantId },
                  data: details,
                });
              else
                await tx.productVariant.create({
                  data: { ...details, productId: savedId },
                });
            }
          }
        } else {
          if (!isNew && data.type && data.type !== current?.type)
            throw new RecordValidationError({
              type: "An existing listing's type cannot be changed. Create a new listing of the required type.",
            });
          const config =
            LISTING_DETAIL_MODELS[
              String(merged.type) as keyof typeof LISTING_DETAIL_MODELS
            ];
          if (!config)
            throw new RecordValidationError({ type: "Choose a listing type." });
          if (isNew) {
            const store = await tx.store.findUnique({
              where: { id: String(storeId) },
              select: { id: true, ownerId: true },
            });
            if (!store)
              throw new RecordValidationError({ storeId: "Choose a store." });
            savedId = (
              await tx.listing.create({
                data: {
                  ...data,
                  storeId: store.id,
                  ownerId: store.ownerId,
                } as Prisma.ListingUncheckedCreateInput,
                select: { id: true },
              })
            ).id;
          } else
            await tx.listing.update({
              where: { id },
              data: {
                ...data,
                updatedAt: new Date(),
              } as Prisma.ListingUpdateInput,
            });
          if (
            isNew ||
            (listingDetails != null &&
              typeof listingDetails === "object" &&
              !Array.isArray(listingDetails))
          ) {
            const detailMeta = modelFields(config.model);
            const oldDetail = current?.[config.relation] as Record<
              string,
              unknown
            > | null;
            const input = oldDetail
              ? listingDetails
              : {
                  ...Object.fromEntries(
                    detailMeta.map((f) => [f.name, f.value]),
                  ),
                  ...((listingDetails as object) || {}),
                };
            let clean: Record<string, unknown>;
            try {
              clean = jsonData(
                validateRecordValues(
                  detailMeta,
                  input as Record<string, unknown>,
                ),
                detailMeta,
              );
            } catch (error) {
              throw new RecordValidationError({
                listingDetails:
                  error instanceof Error
                    ? error.message
                    : "Review the listing specifications.",
              });
            }
            const delegate = tx[config.delegate] as unknown as {
              upsert: (args: unknown) => Promise<unknown>;
            };
            await delegate.upsert({
              where: { listingId: savedId },
              create: { ...clean, listingId: savedId },
              update: clean,
            });
          }
        }
        await tx.notification.create({
          data: {
            userId: session.userId,
            type: "GENERAL",
            title: `${isNew ? "Created" : "Updated"} ${kind}`,
            body: `${savedId}: ${Object.keys(parsed)
              .filter((key) => key !== "password")
              .join(", ")}`,
            linkUrl: `/dashboard/admin/records/${kind}/${savedId}`,
          },
        });
        return savedId;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
    revalidatePath("/dashboard/admin", "layout");
    revalidatePath("/", "layout");
    return { ok: true, id: saved };
  } catch (error) {
    if (error instanceof RecordValidationError)
      return { error: error.message, fieldErrors: error.fields };
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        return {
          error:
            "This email, phone, URL name or reference is already in use. Choose a unique value.",
        };
      if (error.code === "P2034")
        return {
          error:
            "Another update happened at the same time. Reload the record and try again.",
        };
      return {
        error:
          "The record could not be saved. Check the details and try again.",
      };
    }
    return {
      error:
        error instanceof Error ? error.message : "Unable to save this record.",
    };
  }
}
export async function uploadAdminRecordImages(formData: FormData) {
  await admin();
  const file = formData.get("images");
  if (
    !(file instanceof File) ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !file.size ||
    file.size > 4 * 1024 * 1024
  )
    return { ok: false, error: "Choose a JPG, PNG or WebP image up to 4 MB." };
  try {
    return { ok: true, url: await uploadFile(file, "gallery") };
  } catch {
    return {
      ok: false,
      error: "Image upload failed. Check the connection and try again.",
    };
  }
}
