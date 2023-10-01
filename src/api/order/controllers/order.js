("use strict");
// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
/**
 * category controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products } = ctx.request.body;
    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::product.product")
            .findOne(product.id);

          console.log("this is item------->", item);
          console.log("this is product------->", product);
          console.log(
            "=============================" + item.name,
            item.price,
            product.quantity + "============================="
          );

          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.name,
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: product.quantity,
          };
        })
      );

      const session = await stripe.checkout.session.create({
        shipping_address_collection: { allowed_countries: ["US"] },
        payment_method_types: ["card"],
        mode: "payment",
        success_url: process.env.CLIENT_URL + `/success`,
        cancel_url: process.env.CLIENT_URL + `/cancel`,
        line_items: lineItems,
      });

      await strapi
        .service("api::order.order")
        .create({ data: { products, stripeId: session.id } });

      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return { error };
    }
  },
}));
