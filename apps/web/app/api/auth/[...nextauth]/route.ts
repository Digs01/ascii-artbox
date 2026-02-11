import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"

const handler = NextAuth({
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID ?? "",
            clientSecret: process.env.GITHUB_SECRET ?? "",
            authorization: {
                params: {
                    scope: 'read:user user:email gist', // Request gist scope for saving files
                },
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (session?.user) {
                // Expose the access token to the client for API calls (like Gist creation)
                (session as any).accessToken = token.accessToken
            }
            return session
        },
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        }
    }
})

export { handler as GET, handler as POST }
