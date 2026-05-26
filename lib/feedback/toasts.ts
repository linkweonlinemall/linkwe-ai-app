import { toast } from "sonner";

export function toastAddedToCart(productName: string) {
  toast.success("Added to cart", { description: productName });
}

export function toastRemovedFromCart(productName: string) {
  toast.message("Removed from cart", { description: productName });
}

export function toastStoreSaved() {
  toast.success("Store saved");
}

export function toastChangesSaved(message = "Changes saved") {
  toast.success(message);
}

export function toastFormError(message = "Something went wrong. Please try again.") {
  toast.error(message);
}

export function toastOrderPlaced() {
  toast.success("Order placed successfully");
}

export function toastImageUploaded(message = "Image uploaded") {
  toast.success(message);
}

export function toastProfileComplete() {
  toast.success("Profile complete!", {
    description: "Your storefront checklist is finished — nice work.",
    duration: 4000,
  });
}
