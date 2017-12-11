# Setup

To set up the website on your local machine, the following steps are required:

1. Install __Ruby >= 2.1__ if not yet available

    ⚠️ Note for Mac users: macOS Sierra only comes with Ruby 2.0. You must therefore install a newer one manually. The best way to do this is with tools such as [Rbenv](http://rbenv.org) or [RVM](https://rvm.io) (see [short instructions](#install-or-update-ruby) below).
    
    How to check which Ruby version is currently installed:
   
        $ ruby --version
        
    
2. Install __Bundler__ if not yet available

        $ gem install bundler
        
3. Install the necessary libraries if not yet available
        
        $ apt install build-essential patch ruby-dev libffi-dev zlib1g-dev liblzma-dev
        
4. Install __Bundles__ if not yet available

        $ bundle install

5. __Start Jekyll__

        $ bundle exec jekyll serve

    Now the website can be accessed at `http://localhost:4000`.

Here you can find a documentation at GitHub about how to use Jekyll locally: https://help.github.com/articles/setting-up-your-github-pages-site-locally-with-jekyll/

## Install or update ruby

- **Update Ruby on a Mac**

    Open the terminal and enter the following command
    
        $ \curl -sSL https://get.rvm.io | bash -s stable --ruby
    
    When the installation is finished, open a new terminal window and run the command `rvm list known`. This shows a list of all Ruby versions. If version 2.4 is not included, you can install it with `rvm install ruby-2.4.0`. Find out the currently used version with `ruby -v`. If it is an older version than 2.4, you can use `rvm use ruby-2.4.0` to update it.
