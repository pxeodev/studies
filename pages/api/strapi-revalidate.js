import slugify from "slugify"

const strapiModels = ["category", "coin", "page"];

export default async function strapiRevalidate(req, res) {
  const entry = req.body.entry
  const model = req.body.model

  if (req.query.secret !== process.env.STRAPI_REVALIDATE_SECRET) {
    return res.status(401).json({ message: 'Invalid token' })
  }

  if (strapiModels.includes(model)) {
    let revalidatePath;
    if (model === "category") {
      revalidatePath = `/category/${slugify(entry.name)}`
    } else if (model === "coin") {
      revalidatePath = `/coin/${entry.slug}`
    } else if (model === "page") {
      revalidatePath = `/`
    }
    try {
      await res.revalidate(revalidatePath)
      return res.json({ revalidated: true })
    } catch (err) {
      return res.status(500).send('Error revalidating.')
    }
  } else {
    return res.status(500).send('Error revalidating.')
  }
}