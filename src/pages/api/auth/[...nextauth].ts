import { query as q } from "faunadb"
import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import { fauna } from "../../../services/fauna"
import { FaunaAdapter } from "@next-auth/fauna-adapter"

export default NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: {
        params: {
          scope: 'read:user,user:email'
        }
      }
    }),
  ],
  // adapter: FaunaAdapter(fauna)
  callbacks: {
    async signIn({ user }) {
      const { email } = user
      try {
        await fauna.query(
          q.Create(
            q.Collection('users'),
            { data: { email }}
          )
        )
        return true
      } catch (error) {
        return false
      }
    }
  }
})