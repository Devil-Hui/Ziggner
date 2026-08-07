export async function addProductToCart(
  addItem: (skuId: number, quantity: number) => Promise<void>,
  skuId: number,
  quantity: number,
  onSuccess: () => void,
): Promise<void> {
  await addItem(skuId, quantity)
  onSuccess()
}
