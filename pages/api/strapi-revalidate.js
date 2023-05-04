import slugify from "slugify"

const strapiModels = ["category", "coin", "page"];

export default async function strapiRevalidate(req, res) {
  console.log('strapiRevalidate', req.body, req.query)
  const entry = req.body.entry

  if (req.query.secret !== process.env.STRAPI_REVALIDATE_SECRET) {
    return res.status(401).json({ message: 'Invalid token' })
  }

  if (strapiModels.includes(entry.model)) {
    let revalidatePath;
    if (entry.model === "category") {
      revalidatePath = `/category/${slugify(entry.name)}`
    } else if (entry.model === "coin") {
      revalidatePath = `/coin/${entry.slug}`
    } else if (entry.model === "page") {
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