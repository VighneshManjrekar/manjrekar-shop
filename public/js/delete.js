const deleteProduct = (btn) => {
  const productId = btn.parentNode.querySelector("[name=productId]").value;
  const csrf = btn.parentNode.querySelector("[name=_csrf]").value;

  const product = btn.closest(".card");

  console.log(product);

  fetch("/admin/products/" + productId, {
    method: "DELETE",
    headers: {
      "csrf-token": csrf,
    },
  })
    .then((result) => {
      product.parentNode.removeChild(product);
    })
    .catch((err) => {
      console.log(err);
    });
};
