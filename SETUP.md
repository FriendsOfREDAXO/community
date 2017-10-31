# Setup

To set up the website on your local machine, the following steps are required:

1. Install __Ruby >= 2.1__ if not yet available

    ⚠️ Note for Mac users: macOS Sierra only comes with Ruby 2.0. You must therefore install a newer one manually. The best way to do this is with tools such as [Rbenv](http://rbenv.org) or [RVM](https://rvm.io) (see [short instructions](#install-or-update-ruby) below).
    
    How to check which Ruby version is currently installed:
   
        $ ruby --version
        
    
2. Install __Bundler__ if not yet available

        $ gem install bundler

3. __Start Jekyll__

        $ bundle exec jekyll serve

    Now the website can be accessed at `http://localhost:4000`.
    
## Install or update ruby

- **Update Ruby on a Mac**

    Open the terminal and enter the following command
    
        $ \curl -sSL https://get.rvm.io | bash -s stable --ruby
    
    When the installation is finished, open a new terminal window and run the command `rvm list known`. This shows a list of all Ruby versions. If version 2.4 is not included, you can install it with `rvm install ruby-2.4.0`. Find out the currently used version with `ruby -v`. If it is an older version than 2.4, you can use `rvm use ruby-2.4.0` to update it.

## Notes

* ⚠️ You can usually ignore this warning in the terminal when starting Jekyll:
    
        GitHub Metadata: No GitHub API authentication could be found. Some fields may be missing or have incorrect data.

    It appears because API access is limited when you run the page locally. However, all the data relevant to us is already present and there is usually no need to authorize for API access.

* However, if your IP has reached the API limit, you will not be able to avoid creating a personal access token. The option for this can be found in the settings of your GitHub profile ([instructions]((https://help.github.com/articles/creating-an-access-token-for-command-line-use/)) at GitHub), and the token only needs the scope for `public_repo`.

    The easiest way to use the token is to use it when starting Jekyll:

        $ JEKYLL_GITHUB_TOKEN=YOUR_TOKEN bundle exec jekyll serve

* Here you can find a documentation at GitHub about how to use Jekyll locally: https://help.github.com/articles/setting-up-your-github-pages-site-locally-with-jekyll/
