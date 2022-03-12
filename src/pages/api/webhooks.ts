import { NextApiRequest, NextApiResponse } from "next"

const webhook = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('event fired')
  res.status(200).json({ok: true})
}

export default webhook