using Microsoft.Azure.Functions.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Azure.WebJobs.Host.Bindings;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Configuration;
using signalr_function.Data;

[assembly: FunctionsStartup(typeof(signalr_function.Startup))]
namespace signalr_function
{
    public class Startup : FunctionsStartup
    {
        public IConfiguration Configuration { get; protected set; }

        public override void Configure(IFunctionsHostBuilder builder)
        {
            InitializeConfiguration(builder);

            builder.Services.AddHttpClient();

            AppSettings appSettings = Configuration.Get<AppSettings>();
            builder.Services.AddSingleton(appSettings);

            builder.Services.AddSingleton<RoomManager>();
        }

        protected virtual void InitializeConfiguration(IFunctionsHostBuilder builder)
        {
            var executionContextOptions = builder
                .Services
                .BuildServiceProvider()
                .GetService<IOptions<ExecutionContextOptions>>()
                .Value;

            Configuration = new ConfigurationBuilder()
                .SetBasePath(executionContextOptions.AppDirectory)
                .AddEnvironmentVariables()
                .Build();
        }
    }
}